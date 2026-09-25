-- =============================================================================
-- Cshoe — record the amount paid at checkout
--
-- orders.total is the order's current total: update_order_item() (015) works
-- it out again whenever a confirmed order's quantities change. Until now it
-- was also the only record of what the customer paid, so the first edit
-- overwrote that for good. This adds a separate, fixed record:
--
--   public.orders.amount_paid — the total at the moment place_order()
--   created the order.
--
-- Payment is still simulated: nothing here charges, refunds or adds a
-- payments table. It only keeps the original figure, so screens can show
-- "paid ₹X" apart from the current total.
--
-- Who writes it:
--   * place_order() (replaced below, otherwise unchanged from 001) sets it to
--     the total it has just calculated, in the same insert.
--   * Nothing else does. update_order_item() (015), update_order_address()
--     (014), cancel_order() (012/013) and admin_set_order_status() (016) never
--     name the column. Clients cannot write it: public.orders has no update
--     privilege for authenticated at all (016 revoked the last one), and this
--     migration grants none.
--   * orders.total, orders_total_matches and every other column behave
--     exactly as before.
--
-- Existing orders are backfilled with the best original figure available:
--   1. the amount in their "Order confirmed" notification, which place_order()
--      wrote at checkout as the text's last part ('… · ₹38,257') and which
--      nothing has changed since — so it survives any item edits made before
--      this migration;
--   2. otherwise (no notification, or no amount in it) the current total.
-- Notification text and order totals are not changed.
--
-- Once every row has a value, the column is made not null, so a future
-- change to place_order() can't forget it.
--
-- Idempotent: the column is added if missing, the backfill only fills rows
-- still null, the constraint is dropped if present before being added, and
-- the function is created or replaced.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The column
-- -----------------------------------------------------------------------------

alter table public.orders
  add column if not exists amount_paid numeric;

alter table public.orders drop constraint if exists orders_amount_paid_nonnegative;
alter table public.orders
  add constraint orders_amount_paid_nonnegative check (amount_paid >= 0);

-- -----------------------------------------------------------------------------
-- Backfill existing orders
--
-- The confirmation text ends with ' · ₹' and the total in Indian digit
-- grouping (to_char(total, 'FM9,99,99,99,999') in place_order()), so the
-- amount is the digits and commas after the last '₹' at the end of the body.
-- (The orders_sync_cancelled_at trigger from 013 runs on these updates; no
-- status changes, so it leaves cancelled_at as it is.)
-- -----------------------------------------------------------------------------

update public.orders o
set amount_paid = coalesce(
  (
    select replace(substring(n.body from '₹([0-9][0-9,]*)\s*$'), ',', '')::numeric
    from public.notifications n
    where n.order_id = o.id
      and n.type = 'order_confirmed'
      and n.body ~ '₹[0-9][0-9,]*\s*$'
    limit 1
  ),
  o.total
)
where o.amount_paid is null;

alter table public.orders
  alter column amount_paid set not null;

-- -----------------------------------------------------------------------------
-- place_order(address_id, upi_app) → order_number
--
-- Exactly as in 001, except that the order insert also sets amount_paid to
-- the total it calculates.
-- -----------------------------------------------------------------------------

create or replace function public.place_order(p_address_id uuid, p_upi_app public.upi_app)
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

-- Unchanged from 001; repeated so this migration stands on its own.
revoke all on function public.place_order(uuid, public.upi_app) from public, anon;
grant execute on function public.place_order(uuid, public.upi_app) to authenticated;
