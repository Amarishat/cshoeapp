-- =============================================================================
-- Cshoe — "Order updated" notifications for customer edits
--
-- A confirmed order can be changed by its customer: a line's size and
-- quantity (update_order_item(), 015) and the delivery address
-- (update_order_address(), 014). Neither told the customer anything. This
-- adds a third notification type beside "Order confirmed" and
-- "Order cancelled":
--
--   'order_updated' — title 'Order updated'
--     item edit:    'Your changes to order OD… were saved · Total ₹21,257'
--     address edit: 'Order OD… will now be delivered to Kozhikode.'
--
-- One per order, as the unique index notifications_order_type_idx (001)
-- already requires: each later edit refreshes it — new title and text,
-- created_at = now() so it moves to the top, read_at = null so it is unread
-- again — the same insert-or-refresh cancel_order() uses (013). It is written
-- in the same call as the change, so there is never a notification without
-- the change or the other way round.
--
-- Only real changes notify:
--   * update_order_item() already returned early when size and quantity were
--     unchanged; that path still writes nothing.
--   * update_order_address() now compares first: if the chosen address would
--     leave every ship_* value exactly as stored, it returns the order as it
--     is — no write, no notification. (Before, it always re-copied.)
--
-- Both functions are otherwise exactly as in 014 and 015: the same checks,
-- ownership, locking, validation, prices, totals, return values and error
-- codes (28000, P0002, 55000, 22023).
--
-- Unchanged: place_order(), cancel_order(), admin_set_order_status(), the
-- notifications table, its policies and grants, and every order table grant.
-- No admin status notifications.
--
-- Enum values added with alter type … add value can't be used until the
-- transaction that adds them commits; 'order_updated' is only named inside
-- the function bodies, which are resolved when they run, not when created.
--
-- Idempotent: the enum value is added only if missing, and both functions are
-- created or replaced.
-- =============================================================================

alter type public.notification_type add value if not exists 'order_updated';

-- -----------------------------------------------------------------------------
-- update_order_item(order_number, item_id, size_uk, quantity)
--   → (order_number, item_id, size_uk, quantity, subtotal, total)
--
-- As in 015, plus the "Order updated" notification after a real change.
-- -----------------------------------------------------------------------------

create or replace function public.update_order_item(
  p_order_number text,
  p_item_id      uuid,
  p_size_uk      numeric,
  p_quantity     integer
)
returns table (
  order_number text,
  item_id      uuid,
  size_uk      numeric,
  quantity     integer,
  subtotal     integer,
  total        integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max_quantity constant integer := 10;

  v_user_id      uuid := auth.uid();
  v_order        public.orders%rowtype;
  v_item         public.order_items%rowtype;
  v_size_changed boolean;
  v_subtotal     integer;
  v_total        integer;
begin
  if v_user_id is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  -- The caller's own order only, locked so a concurrent change (a cancel, an
  -- admin status change, another edit) waits for this one.
  select * into v_order
  from public.orders o
  where o.order_number = p_order_number and o.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'Order % can''t be changed: it is already %',
      v_order.order_number, replace(v_order.status::text, '_', ' ')
      using errcode = '55000',
            hint = 'Only a confirmed order that hasn''t shipped yet can be changed.';
  end if;

  -- The line must belong to this order — an id from any other order is not found.
  select * into v_item
  from public.order_items oi
  where oi.id = p_item_id and oi.order_id = v_order.id;

  if not found then
    raise exception 'Order item not found' using errcode = 'P0002';
  end if;

  -- Quantity: 1–10.
  if p_quantity is null or p_quantity < 1 or p_quantity > c_max_quantity then
    raise exception 'Quantity must be between 1 and %', c_max_quantity using errcode = '22023';
  end if;

  -- Size: a whole or half UK size that fits size_uk numeric(3,1).
  if p_size_uk is null or p_size_uk <= 0 or p_size_uk >= 100 or p_size_uk * 2 <> trunc(p_size_uk * 2) then
    raise exception 'Invalid size: % (sizes are whole or half UK sizes)', p_size_uk using errcode = '22023';
  end if;

  v_size_changed := p_size_uk <> v_item.size_uk;

  -- Nothing to change: no writes.
  if not v_size_changed and p_quantity = v_item.quantity then
    return query
    select v_order.order_number, v_item.id, v_item.size_uk, v_item.quantity, v_order.subtotal, v_order.total;
    return;
  end if;

  if v_size_changed then
    if v_item.product_id is null then
      raise exception 'The size of % can''t be changed: the product is no longer available', v_item.product_name
        using errcode = '22023',
              hint = 'The quantity can still be changed.';
    end if;

    if not exists (
      select 1
      from public.product_sizes ps
      where ps.product_id = v_item.product_id and ps.size_uk = p_size_uk
    ) then
      raise exception 'Size UK % isn''t available for %', p_size_uk, v_item.product_name
        using errcode = '22023';
    end if;
  end if;

  -- Only the size and quantity; the price paid and the snapshot stay as ordered.
  update public.order_items oi
  set size_uk  = p_size_uk,
      quantity = p_quantity
  where oi.id = v_item.id;

  -- The order's totals from its own lines, with its stored discount and fees.
  select coalesce(sum(oi.unit_price * oi.quantity), 0)::integer into v_subtotal
  from public.order_items oi
  where oi.order_id = v_order.id;

  update public.orders o
  set subtotal = v_subtotal,
      total    = v_subtotal - o.discount + o.delivery_fee + o.platform_fee
  where o.id = v_order.id
  returning o.total into v_total;

  -- "Order updated" notification, e.g.
  -- 'Your changes to order OD10000000001 were saved · Total ₹21,257'.
  -- One per order: a later edit (of an item or the address) refreshes it —
  -- new text, moved to now and unread again — instead of adding another.
  insert into public.notifications (user_id, order_id, type, title, body)
  values (
    v_user_id,
    v_order.id,
    'order_updated',
    'Order updated',
    'Your changes to order ' || v_order.order_number || ' were saved'
      -- Indian digit grouping, e.g. ₹1,23,45,678 (as place_order() writes it).
      || ' · Total ₹' || to_char(v_total, 'FM9,99,99,99,999')
  )
  on conflict (order_id, type) where order_id is not null
  do update set
    title      = excluded.title,
    body       = excluded.body,
    created_at = now(),
    read_at    = null;

  return query
  select o.order_number, oi.id, oi.size_uk, oi.quantity, o.subtotal, o.total
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  where o.id = v_order.id and oi.id = v_item.id;
end;
$$;

revoke all on function public.update_order_item(text, uuid, numeric, integer) from public, anon;
grant execute on function public.update_order_item(text, uuid, numeric, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- update_order_address(order_number, address_id)
--   → (order_number, ship_full_name, ship_phone, ship_pincode, ship_state,
--      ship_city, ship_area, ship_street, ship_type)
--
-- As in 014, except that it first checks whether anything would change, and
-- adds the "Order updated" notification after a real change.
-- -----------------------------------------------------------------------------

create or replace function public.update_order_address(p_order_number text, p_address_id uuid)
returns table (
  order_number   text,
  ship_full_name text,
  ship_phone     text,
  ship_pincode   text,
  ship_state     text,
  ship_city      text,
  ship_area      text,
  ship_street    text,
  ship_type      public.address_type
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_order   public.orders%rowtype;
  v_address public.addresses%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  -- The caller's own order only, locked so a concurrent change (a cancel, an
  -- admin status change, another address edit) waits for this one.
  select * into v_order
  from public.orders o
  where o.order_number = p_order_number and o.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'The delivery address of order % can''t be changed: it is already %',
      v_order.order_number, replace(v_order.status::text, '_', ' ')
      using errcode = '55000',
            hint = 'Only a confirmed order that hasn''t shipped yet can be changed.';
  end if;

  -- The address must belong to the caller (as in place_order()).
  select * into v_address
  from public.addresses a
  where a.id = p_address_id and a.user_id = v_user_id;

  if not found then
    raise exception 'Address not found' using errcode = 'P0002';
  end if;

  -- The chosen address would leave the shipping snapshot exactly as it is:
  -- nothing to change, so no write and no notification.
  if v_order.ship_full_name is not distinct from v_address.full_name
     and v_order.ship_phone   is not distinct from v_address.phone
     and v_order.ship_pincode is not distinct from v_address.pincode
     and v_order.ship_state   is not distinct from v_address.state
     and v_order.ship_city    is not distinct from v_address.city
     and v_order.ship_area    is not distinct from v_address.area
     and v_order.ship_street  is not distinct from v_address.street
     and v_order.ship_type    is not distinct from v_address.type
  then
    return query
    select v_order.order_number, v_order.ship_full_name, v_order.ship_phone, v_order.ship_pincode,
           v_order.ship_state, v_order.ship_city, v_order.ship_area, v_order.ship_street, v_order.ship_type;
    return;
  end if;

  -- The same snapshot place_order() takes: the address used, and the ship_*
  -- copy that is actually shown and delivered to. Nothing else is touched.
  update public.orders o
  set address_id     = v_address.id,
      ship_full_name = v_address.full_name,
      ship_phone     = v_address.phone,
      ship_pincode   = v_address.pincode,
      ship_state     = v_address.state,
      ship_city      = v_address.city,
      ship_area      = v_address.area,
      ship_street    = v_address.street,
      ship_type      = v_address.type
  where o.id = v_order.id;

  -- "Order updated" notification, e.g.
  -- 'Order OD10000000001 will now be delivered to Kozhikode.'
  -- One per order: a later edit (of the address or an item) refreshes it —
  -- new text, moved to now and unread again — instead of adding another.
  insert into public.notifications (user_id, order_id, type, title, body)
  values (
    v_user_id,
    v_order.id,
    'order_updated',
    'Order updated',
    'Order ' || v_order.order_number || ' will now be delivered to ' || v_address.city || '.'
  )
  on conflict (order_id, type) where order_id is not null
  do update set
    title      = excluded.title,
    body       = excluded.body,
    created_at = now(),
    read_at    = null;

  return query
  select o.order_number, o.ship_full_name, o.ship_phone, o.ship_pincode, o.ship_state,
         o.ship_city, o.ship_area, o.ship_street, o.ship_type
  from public.orders o
  where o.id = v_order.id;
end;
$$;

revoke all on function public.update_order_address(text, uuid) from public, anon;
grant execute on function public.update_order_address(text, uuid) to authenticated;
