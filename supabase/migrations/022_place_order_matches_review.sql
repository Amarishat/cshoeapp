-- =============================================================================
-- Cshoe — the order the customer reviewed is the order that is placed
--
-- The Bag and checkout screens only show and price the items the app's Bag
-- catalogue can show (lib/data/bagCatalogue.ts): a product with a live page
-- and a cut-out, or a customisable product with a customiser. A selected Bag
-- row for any other product was left out of the total the customer saw, with
-- a note that it "isn't included" — but place_order() ordered every selected
-- row regardless, so the customer could be charged more than the total they
-- reviewed. This replaces place_order() so the database is the final word,
-- in two ways:
--
--   1. It refuses the order (55000) if any selected row's product fails the
--      Bag catalogue's rule, naming the products and asking the customer to
--      remove them from the Bag. Nothing is ordered and nothing is removed:
--      the Bag is left exactly as it is.
--   2. It takes the total the customer was shown, p_expected_total, and
--      refuses (55000) if what it is about to charge differs. That covers
--      prices, quantities or the selection changing between the review and
--      the payment — the screens don't refresh on their own — whatever the
--      cause. It is optional (null skips the check) so older callers keep
--      working; the app always sends it.
--
-- Everything else in place_order() is exactly as in 017: the same ownership,
-- locking, address and customisation checks, pricing from the database,
-- amount_paid, the confirmation notification and the same error codes.
-- The quantity limit from 021 still applies to every row.
--
-- The parameter list changes, so the 017 signature is dropped first; the new
-- one is granted exactly as before (authenticated only). Apply this before
-- deploying the app change that sends p_expected_total: the old app still
-- works against the new function, the new app needs it.
--
-- Idempotent: the old signature is dropped only if present, and the function
-- is created or replaced.
-- =============================================================================

drop function if exists public.place_order(uuid, public.upi_app);

create or replace function public.place_order(
  p_address_id     uuid,
  p_upi_app        public.upi_app,
  p_expected_total integer default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_delivery_fee constant integer := 1250;
  c_platform_fee constant integer := 9;

  v_user_id      uuid := auth.uid();
  v_address      public.addresses%rowtype;
  v_cart_ids     uuid[];
  v_subtotal     integer;
  v_item_count   integer;
  v_order_id     uuid;
  v_order_number text;
  v_total        integer;
  v_first_name   text;
  v_item_id      uuid;
  v_bad_parts    integer;
  v_unavailable  text;
  v_unavailable_n integer;
  r              record;
begin
  if v_user_id is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  -- The address must belong to the caller.
  select * into v_address
  from public.addresses a
  where a.id = p_address_id and a.user_id = v_user_id;
  if not found then
    raise exception 'Address not found' using errcode = 'P0002';
  end if;

  -- Lock the caller's selected Bag items and fix the exact set being ordered.
  -- Every later statement uses only these ids, so items added or selected
  -- while this runs are not ordered, and a second concurrent call waits and
  -- then finds these items gone.
  v_cart_ids := array(
    select ci.id
    from public.cart_items ci
    where ci.user_id = v_user_id and ci.is_selected
    order by ci.created_at, ci.id
    for update
  );

  select count(*), coalesce(sum(p.price * ci.quantity), 0)
  into v_item_count, v_subtotal
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any (v_cart_ids);

  if v_item_count = 0 then
    raise exception 'No selected items in the bag' using errcode = 'P0002';
  end if;

  -- Every item must be one the checkout can show and price: a product with a
  -- live page and a cut-out, or a customisable product with a customiser
  -- (the same rule as the app's Bag catalogue, lib/data/bagCatalogue.ts).
  -- Anything else was left out of the total the customer saw, so it is never
  -- ordered: the whole order is refused instead, and the Bag is left exactly
  -- as it is for the customer to review.
  select count(distinct p.id), string_agg(distinct p.name, ', ' order by p.name)
  into v_unavailable_n, v_unavailable
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  left join public.customization_configs cc on cc.product_id = p.id
  where ci.id = any (v_cart_ids)
    and not (
      (p.has_product_page and p.cutout_url is not null)
      or (p.is_customizable and cc.product_id is not null)
    );

  if v_unavailable_n > 0 then
    raise exception '% % not available right now. Remove % from your bag and try again.',
      v_unavailable,
      case when v_unavailable_n = 1 then 'isn''t' else 'aren''t' end,
      case when v_unavailable_n = 1 then 'it' else 'them' end
      using errcode = '55000';
  end if;

  -- Customised items: the product must have a customiser, and every
  -- part/colour must exist in it.
  if exists (
    select 1
    from public.cart_items ci
    left join public.customization_configs cc on cc.product_id = ci.product_id
    where ci.id = any (v_cart_ids)
      and ci.customization is not null and cc.product_id is null
  ) then
    raise exception 'Customised item for a product without a customiser' using errcode = '22023';
  end if;

  select count(*) into v_bad_parts
  from public.cart_items ci
  cross join lateral jsonb_each(ci.customization) as sel(part_id, colour_id)
  left join public.customization_parts cp
    on cp.product_id = ci.product_id and cp.id = sel.part_id
  left join public.customization_colours cl
    on cl.product_id = ci.product_id and cl.id = (sel.colour_id #>> '{}')
  where ci.id = any (v_cart_ids) and ci.customization is not null
    and (cp.id is null or cl.id is null or jsonb_typeof(sel.colour_id) <> 'string');

  if v_bad_parts > 0 then
    raise exception 'Invalid customisation' using errcode = '22023';
  end if;

  v_total := v_subtotal + c_delivery_fee + c_platform_fee;

  -- What is about to be charged must be the total the customer was shown
  -- (p_expected_total, sent by the checkout screens). Prices, quantities or
  -- the selection can change in between (e.g. from another tab), and the
  -- screens don't refresh on their own: a mismatch is refused, never charged.
  if p_expected_total is not null and p_expected_total <> v_total then
    raise exception 'Your bag has changed since you reviewed it: the total is now ₹%. Review your bag and try again.',
      to_char(v_total, 'FM9,99,99,99,999')
      using errcode = '55000';
  end if;

  insert into public.orders (
    user_id, status, address_id,
    ship_full_name, ship_phone, ship_pincode, ship_state, ship_city, ship_area, ship_street, ship_type,
    payment_method, upi_app,
    subtotal, discount, delivery_fee, platform_fee, total,
    amount_paid
  )
  values (
    v_user_id, 'confirmed', v_address.id,
    v_address.full_name, v_address.phone, v_address.pincode, v_address.state,
    v_address.city, v_address.area, v_address.street, v_address.type,
    'upi', p_upi_app,
    v_subtotal, 0, c_delivery_fee, c_platform_fee, v_total,
    -- What the (simulated) payment was for: the total at checkout. Later
    -- item edits change total, never this.
    v_total
  )
  returning id, order_number into v_order_id, v_order_number;

  -- One order item per selected Bag item, with a display snapshot.
  -- Customised lines show the customiser's title/category/image (as the Bag
  -- does); plain lines show the product, using its cut-out when it has one.
  for r in
    select
      ci.id as cart_item_id,
      ci.product_id,
      ci.size_uk,
      ci.quantity,
      ci.customization,
      p.price,
      case when ci.customization is not null then cc.title else p.name end as product_name,
      case when ci.customization is not null then cc.display_category else p.category end as product_category,
      case
        when ci.customization is not null then cc.image_url
        when p.cutout_url is not null then p.cutout_url
        when cc.image_url is not null then cc.image_url
        else p.card_image ->> 'src'
      end as image_url,
      case
        when ci.customization is not null then 'contain'
        when p.cutout_url is not null then 'cover'
        else 'contain'
      end as image_fit
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    left join public.customization_configs cc on cc.product_id = ci.product_id
    where ci.id = any (v_cart_ids)
    order by ci.created_at, ci.id
  loop
    -- The first line names the order in the notification (as in the app).
    if v_first_name is null then
      v_first_name := r.product_name;
    end if;

    insert into public.order_items (
      order_id, product_id, product_name, product_category, image_url, image_fit,
      size_uk, quantity, unit_price, is_customized
    )
    values (
      v_order_id, r.product_id, r.product_name, r.product_category, r.image_url, r.image_fit,
      r.size_uk, r.quantity, r.price, r.customization is not null
    )
    returning id into v_item_id;

    if r.customization is not null then
      insert into public.order_item_customizations (
        order_item_id, part_id, part_name, colour_id, colour_name, colour_hex
      )
      select v_item_id, cp.id, cp.name, cl.id, cl.name, cl.hex
      from jsonb_each_text(r.customization) as sel(part_id, colour_id)
      join public.customization_parts cp
        on cp.product_id = r.product_id and cp.id = sel.part_id
      join public.customization_colours cl
        on cl.product_id = r.product_id and cl.id = sel.colour_id;
    end if;
  end loop;

  -- Remove exactly the items that were ordered.
  delete from public.cart_items ci
  where ci.id = any (v_cart_ids);

  -- "Order confirmed" notification, e.g.
  -- 'Order OD10000000001 · Nike Sabrina 2 EP + 1 more · ₹38,257'.
  insert into public.notifications (user_id, order_id, type, title, body)
  values (
    v_user_id,
    v_order_id,
    'order_confirmed',
    'Order confirmed',
    'Order ' || v_order_number
      || ' · ' || coalesce(v_first_name, 'Your items')
      || case when v_item_count > 1 then ' + ' || (v_item_count - 1) || ' more' else '' end
      -- Indian digit grouping, e.g. ₹1,23,45,678.
      || ' · ₹' || to_char(v_total, 'FM9,99,99,99,999')
  );

  return v_order_number;
end;
$$;

-- As in 001/017: only signed-in users may place orders; functions are
-- executable by PUBLIC by default, so revoke that first.
revoke all on function public.place_order(uuid, public.upi_app, integer) from public, anon;
grant execute on function public.place_order(uuid, public.upi_app, integer) to authenticated;
