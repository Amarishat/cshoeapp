-- =============================================================================
-- Cshoe — tell the customer when an admin moves their order on
--
-- admin_set_order_status() (016) is the only way an order's status changes
-- after checkout, apart from the customer's own cancel_order(). Until now the
-- customer heard nothing when an admin shipped, dispatched, delivered or
-- cancelled their order. This adds three notification types and has the
-- function write one notification per status change:
--
--   confirmed        → shipped           'order_shipped'
--       'Order shipped'    / 'Your order OD… has been shipped.'
--   shipped          → out_for_delivery  'order_out_for_delivery'
--       'Out for delivery' / 'Your order OD… is out for delivery.'
--   out_for_delivery → delivered         'order_delivered'
--       'Order delivered'  / 'Your order OD… has been delivered.'
--   confirmed        → cancelled         'order_cancelled' (reused from 012)
--       'Order cancelled'  / 'Order OD… has been cancelled.'
--
-- The notification belongs to the locked order's own customer (its user_id),
-- not to the admin. It is written in the same call as the status change, so
-- either both happen or neither does. Each type is one per order
-- (notifications_order_type_idx, 001): an existing one is refreshed with the
-- insert-or-refresh from 013 (new title and text, created_at = now(),
-- read_at = null) instead of being duplicated. Admin status changes never
-- write 'order_updated'; that stays for the customer's own edits (018).
--
-- Everything else in admin_set_order_status() is exactly as in 016: signed in
-- and is_admin() required, the order locked, the expected status checked
-- (55000 when stale), no-ops and disallowed moves refused (22023), the same
-- four transitions with delivered and cancelled final, only orders.status
-- written (cancelled_at still kept by the 013 trigger), the same return shape
-- and the same grants.
--
-- Unchanged: every other function, the notification types from 001–018, the
-- notifications table, its policies and grants, and all order data. No audit
-- table.
--
-- Enum values added with alter type … add value can't be used until the
-- transaction that adds them commits; the new values are only named inside
-- the function body, which is resolved when it runs, not when it is created.
--
-- Idempotent: the enum values are added only if missing, and the function is
-- created or replaced.
-- =============================================================================

alter type public.notification_type add value if not exists 'order_shipped';
alter type public.notification_type add value if not exists 'order_out_for_delivery';
alter type public.notification_type add value if not exists 'order_delivered';

-- -----------------------------------------------------------------------------
-- admin_set_order_status(order_number, expected_status, new_status)
--   → (order_number, status, cancelled_at)
--
-- As in 016, plus the customer's notification for the new status.
-- -----------------------------------------------------------------------------

create or replace function public.admin_set_order_status(
  p_order_number    text,
  p_expected_status public.order_status,
  p_new_status      public.order_status
)
returns table (order_number text, status public.order_status, cancelled_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order   public.orders%rowtype;
  v_allowed boolean;
  v_type    public.notification_type;
  v_title   text;
  v_body    text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  if not public.is_admin() then
    raise exception 'Only an admin can change an order''s status' using errcode = '42501';
  end if;

  if p_expected_status is null or p_new_status is null then
    raise exception 'Both the expected and the new status are required' using errcode = '22023';
  end if;

  -- Locked so a customer's cancel or edit (which lock the same row) either
  -- finishes first — and is then seen below — or waits for this change.
  select * into v_order
  from public.orders o
  where o.order_number = p_order_number
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  -- The status must still be the one the admin was looking at.
  if v_order.status <> p_expected_status then
    raise exception 'Order % has changed since it was loaded: it is now %, not %',
      v_order.order_number,
      replace(v_order.status::text, '_', ' '),
      replace(p_expected_status::text, '_', ' ')
      using errcode = '55000',
            hint = 'Reload the order and try again.';
  end if;

  if p_new_status = v_order.status then
    raise exception 'Order % is already %', v_order.order_number, replace(v_order.status::text, '_', ' ')
      using errcode = '22023';
  end if;

  -- Forward along fulfilment only, or cancel before shipping; delivered and
  -- cancelled are final.
  v_allowed := case v_order.status
    when 'confirmed'        then p_new_status in ('shipped', 'cancelled')
    when 'shipped'          then p_new_status = 'out_for_delivery'
    when 'out_for_delivery' then p_new_status = 'delivered'
    else false
  end;

  if not v_allowed then
    raise exception 'Order % can''t go from % to %',
      v_order.order_number,
      replace(v_order.status::text, '_', ' '),
      replace(p_new_status::text, '_', ' ')
      using errcode = '22023',
            hint = 'Allowed: confirmed → shipped or cancelled; shipped → out for delivery; out for delivery → delivered.';
  end if;

  -- Only the status; cancelled_at is kept in step by orders_sync_cancelled_at (013).
  update public.orders o
  set status = p_new_status
  where o.id = v_order.id;

  -- Tell the order's customer, in the same call: if this insert fails, the
  -- status change above is rolled back with it. One notification per type
  -- per order (notifications_order_type_idx, 001); should one already exist
  -- it is refreshed — new text, moved to now, unread again — as in 013.
  -- A cancellation reuses the customer's own 'order_cancelled' type, so an
  -- order never shows two "Order cancelled" notifications.
  case p_new_status
    when 'shipped' then
      v_type  := 'order_shipped';
      v_title := 'Order shipped';
      v_body  := 'Your order ' || v_order.order_number || ' has been shipped.';
    when 'out_for_delivery' then
      v_type  := 'order_out_for_delivery';
      v_title := 'Out for delivery';
      v_body  := 'Your order ' || v_order.order_number || ' is out for delivery.';
    when 'delivered' then
      v_type  := 'order_delivered';
      v_title := 'Order delivered';
      v_body  := 'Your order ' || v_order.order_number || ' has been delivered.';
    when 'cancelled' then
      v_type  := 'order_cancelled';
      v_title := 'Order cancelled';
      v_body  := 'Order ' || v_order.order_number || ' has been cancelled.';
    -- No else: every status reachable here is listed, and a CASE with no match
    -- raises, so a status without a notification can't slip through.
  end case;

  insert into public.notifications (user_id, order_id, type, title, body)
  values (v_order.user_id, v_order.id, v_type, v_title, v_body)
  on conflict (order_id, type) where order_id is not null
  do update set
    title      = excluded.title,
    body       = excluded.body,
    created_at = now(),
    read_at    = null;

  return query
  select o.order_number, o.status, o.cancelled_at
  from public.orders o
  where o.id = v_order.id;
end;
$$;

-- Unchanged from 016: callable by signed-in users only; the function itself
-- admits admins only.
revoke all on function public.admin_set_order_status(text, public.order_status, public.order_status) from public, anon;
grant execute on function public.admin_set_order_status(text, public.order_status, public.order_status) to authenticated;
