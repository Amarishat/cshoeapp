-- =============================================================================
-- Cshoe — a customised item needs a product that is still customisable
--
-- place_order() (latest in 022) checked that a customised Bag item's product
-- has a customiser and that every chosen part and colour still exists, but
-- not the product's is_customizable flag. So a product switched off for
-- customising in admin — whose customiser setup still exists — could still be
-- ordered with a design. The app already blocks that (the customiser, the
-- Customise tab, add-to-bag and checkout all honour the flag); this makes the
-- database the final word too.
--
-- The only change: after the existing "product must have a customiser" check,
-- a selected Bag item with a customisation whose product has
-- is_customizable = false refuses the whole order:
--
--   'A customised item is no longer available for customisation. Remove it
--    from your bag and try again.'   (55000, like 022's other "no longer
--    available" refusals, so the app shows it as-is with "Review your bag")
--
-- Nothing is ordered and the Bag is left as it is. Plain (non-customised)
-- items are unaffected: the flag only matters for items with a design.
--
-- Everything else is exactly as in 022 — sign-in and address checks, the
-- locked Bag selection, the availability rule, the customiser and
-- part/colour checks, pricing from the database, the expected-total check,
-- the order, its lines and customisation snapshots, amount_paid, removing the
-- ordered Bag rows, the confirmation notification, the error codes, and the
-- quantity limit from 021 (a table constraint). Same signature and grants.
--
-- Idempotent: the function is created or replaced.
-- =============================================================================

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

  -- …and the product must still be offered for customising: switching
  -- "Customisable" off in admin (products.is_customizable = false) stops
  -- designs for it being ordered, even though its customiser still exists.
  if exists (
    select 1
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.id = any (v_cart_ids)
      and ci.customization is not null and not p.is_customizable
  ) then
    raise exception 'A customised item is no longer available for customisation. Remove it from your bag and try again.'
      using errcode = '55000';
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

-- Unchanged from 022: only signed-in users may place orders.
revoke all on function public.place_order(uuid, public.upi_app, integer) from public, anon;
grant execute on function public.place_order(uuid, public.upi_app, integer) to authenticated;
