-- =============================================================================
-- Cshoe — customers can cancel their own confirmed orders
--
-- Until now an order could only move forward (confirmed → shipped → out for
-- delivery → delivered), and only an admin could move it (009). This adds a
-- cancelled state and one narrow way for a customer to reach it:
--
--   public.cancel_order(order_number) → (order_number, status)
--
-- The function is the only customer write path. It cancels the caller's own
-- order, and only while it is still 'confirmed' (not yet shipped), stamps
-- cancelled_at and creates an "Order cancelled" notification — all in one
-- call, so either everything happens or nothing does.
--
-- What is deliberately NOT done here:
--   * No customer update policy on public.orders. 009 grants the column
--     privilege update (status) to authenticated, and only the admin-only
--     policy "Admins update order status" lets an update through. A customer
--     update policy on top of that would let a customer set any status
--     (e.g. 'delivered'), so customers go through cancel_order() instead.
--   * The admin policy from 009 is unchanged.
--   * Nothing is restocked or refunded: there is no stock data and payment is
--     simulated.
--
-- Enum values added with alter type … add value can't be used until the
-- transaction that adds them commits. Nothing below uses the new values
-- directly: cancel_order() only refers to them inside its body, which is
-- resolved when the function runs, not when it is created.
--
-- Idempotent: the enum values and the column are added only if missing, and
-- the function is created or replaced.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Schema additions
-- -----------------------------------------------------------------------------

alter type public.order_status add value if not exists 'cancelled';

alter type public.notification_type add value if not exists 'order_cancelled';

-- When the order was cancelled; null for every order that hasn't been.
alter table public.orders
  add column if not exists cancelled_at timestamptz;

-- -----------------------------------------------------------------------------
-- cancel_order(order_number) → (order_number, status)
--
-- Cancels one of the caller's own orders while it is still 'confirmed'.
-- An order that doesn't exist and one that belongs to someone else give the
-- same "Order not found" error, so order numbers can't be probed.
-- -----------------------------------------------------------------------------

create or replace function public.cancel_order(p_order_number text)
returns table (order_number text, status public.order_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_order   public.orders%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  -- The caller's own order only, locked so a concurrent cancel (or an admin
  -- status change) waits for this one and then sees its result.
  select * into v_order
  from public.orders o
  where o.order_number = p_order_number and o.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'Order % can''t be cancelled: it is already %',
      v_order.order_number, replace(v_order.status::text, '_', ' ')
      using errcode = '55000',
            hint = 'Only a confirmed order that hasn''t shipped yet can be cancelled.';
  end if;

  update public.orders o
  set status = 'cancelled', cancelled_at = now()
  where o.id = v_order.id;

  -- "Order cancelled" notification, e.g. 'Order OD10000000001 has been cancelled.'
  insert into public.notifications (user_id, order_id, type, title, body)
  values (
    v_user_id,
    v_order.id,
    'order_cancelled',
    'Order cancelled',
    'Order ' || v_order.order_number || ' has been cancelled.'
  );

  return query
  select o.order_number, o.status
  from public.orders o
  where o.id = v_order.id;
end;
$$;

-- Only signed-in users may cancel; functions are executable by PUBLIC by
-- default, so revoke that first.
revoke all on function public.cancel_order(text) from public, anon;
grant execute on function public.cancel_order(text) to authenticated;
