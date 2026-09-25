-- =============================================================================
-- Cshoe — admin status changes go through one checked function
--
-- Until now an admin changed an order's status with a direct update on
-- public.orders (009: the column privilege update (status) plus the
-- admin-only policy "Admins update order status"). That allowed any status
-- to become any other — backwards too (delivered → confirmed, cancelled →
-- confirmed), which reopened customer cancelling and editing — and an admin
-- working from a stale screen could silently overwrite a change the customer
-- had just made (e.g. ship an order the customer had cancelled a moment ago).
--
-- This replaces that path with one function:
--
--   public.admin_set_order_status(order_number, expected_status, new_status)
--     → (order_number, status, cancelled_at)
--
-- It locks the order, refuses unless the status is still the one the admin
-- saw (expected_status), and allows only forward moves along fulfilment, or
-- cancelling before shipping:
--
--   confirmed        → shipped
--   confirmed        → cancelled
--   shipped          → out_for_delivery
--   out_for_delivery → delivered
--
-- delivered and cancelled are final; there is no way back to confirmed and no
-- restore. Only orders.status is written; the orders_sync_cancelled_at
-- trigger (013) still stamps or clears cancelled_at.
--
-- Errors, in the style of 012–015:
--   28000  not signed in
--   42501  signed in, but not an admin
--   P0002  order not found
--   55000  the order's status is no longer expected_status (it changed since
--          the admin loaded it)
--   22023  no change (new = current), or a move that isn't allowed
--
-- Security changes:
--   * 009's direct path is removed: the policy "Admins update order status"
--     is dropped and update (status) on public.orders is revoked from
--     authenticated. After this, no client role can update public.orders at
--     all; every order change goes through a security definer function
--     (place_order, cancel_order, update_order_address, update_order_item,
--     admin_set_order_status).
--   * Execute is granted to authenticated (admins sign in as ordinary
--     authenticated users); the function itself refuses anyone who isn't
--     public.is_admin() (006), so customers and guests can call it but are
--     always turned away.
--   * The customer functions (012–015) and the admin read policies (008,
--     011) are unchanged.
--
-- Note for the app: the admin screen's current direct update stops working
-- once this is applied; it must call admin_set_order_status() instead.
--
-- No new table, notification or audit record.
--
-- Idempotent: the policy is dropped if present, the revoke is re-runnable and
-- the function is created or replaced.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Remove the direct admin update path (009)
-- -----------------------------------------------------------------------------

drop policy if exists "Admins update order status" on public.orders;

revoke update (status) on public.orders from authenticated;

-- -----------------------------------------------------------------------------
-- admin_set_order_status(order_number, expected_status, new_status)
--   → (order_number, status, cancelled_at)
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

  return query
  select o.order_number, o.status, o.cancelled_at
  from public.orders o
  where o.id = v_order.id;
end;
$$;

-- Callable by signed-in users only; the function itself admits admins only.
-- Functions are executable by PUBLIC by default, so revoke that first.
revoke all on function public.admin_set_order_status(text, public.order_status, public.order_status) from public, anon;
grant execute on function public.admin_set_order_status(text, public.order_status, public.order_status) to authenticated;
