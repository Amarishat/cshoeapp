-- =============================================================================
-- Cshoe — customers can change the delivery address of a confirmed order
--
-- An order keeps its own snapshot of where it goes: the ship_* columns, which
-- public.place_order() (001) copies from one of the customer's saved
-- addresses, with address_id recording which one. Nothing could change them
-- after checkout. This adds one narrow way for the customer to do it:
--
--   public.update_order_address(order_number, address_id)
--     → (order_number, ship_full_name, ship_phone, ship_pincode, ship_state,
--        ship_city, ship_area, ship_street, ship_type)
--
-- It re-copies the snapshot from another of the caller's own saved
-- addresses, exactly as place_order() does, and only while the order is
-- still 'confirmed' (not yet shipped). Nothing else on the order changes:
-- totals, items, status, payment and order number are left as they are.
--
-- The same shape as public.cancel_order() (012/013): the caller's own order
-- only, locked for the change, the same error codes —
--   28000  not signed in
--   P0002  order or address not found (including someone else's: the two
--          cases give the same error, so neither can be probed)
--   55000  the order is no longer 'confirmed'
--
-- What is deliberately NOT done here:
--   * No customer update policy or grant on public.orders. Customers change
--     an order only through functions like this one; the admin-only status
--     policy from 009 is unchanged.
--   * No notification: nothing in public.notification_type describes it,
--     and adding a type is a schema change left for later.
--
-- The orders_sync_cancelled_at trigger (013) runs on this update too; the
-- order stays 'confirmed', so it leaves cancelled_at null as it already is.
--
-- Idempotent: the function is created or replaced.
-- =============================================================================

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

  return query
  select o.order_number, o.ship_full_name, o.ship_phone, o.ship_pincode, o.ship_state,
         o.ship_city, o.ship_area, o.ship_street, o.ship_type
  from public.orders o
  where o.id = v_order.id;
end;
$$;

-- Only signed-in users may change an order's address; functions are
-- executable by PUBLIC by default, so revoke that first.
revoke all on function public.update_order_address(text, uuid) from public, anon;
grant execute on function public.update_order_address(text, uuid) to authenticated;
