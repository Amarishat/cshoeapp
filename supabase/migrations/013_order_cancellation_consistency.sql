-- =============================================================================
-- Cshoe — keep cancellation consistent between customers and admins
--
-- 012 let a customer cancel a confirmed order through public.cancel_order(),
-- which sets status = 'cancelled', stamps cancelled_at and creates an
-- "Order cancelled" notification. Admins change status separately, through
-- the column privilege update (status) and the admin-only policy from 009.
-- That left three gaps:
--
--   1. An admin setting an order to 'cancelled' left cancelled_at null (the
--      admin can only write the status column).
--   2. An admin moving a cancelled order back to another status left the old
--      cancelled_at behind.
--   3. If an admin restored a customer-cancelled order to 'confirmed' and the
--      customer cancelled it again, cancel_order() failed: its second
--      "Order cancelled" notification broke the one-per-type-per-order unique
--      index notifications_order_type_idx (001), rolling the whole call back.
--
-- Fixes:
--   * A before-update trigger on public.orders keeps cancelled_at in step
--     with status, whoever makes the change: entering 'cancelled' stamps
--     now(), leaving it clears the stamp, staying cancelled keeps it. It only
--     edits the row being written, so it needs no extra privilege and changes
--     nothing about who may update what.
--   * cancel_order() is replaced so that a repeat cancellation reuses the
--     order's existing "Order cancelled" notification — moved to now and
--     marked unread again, so the customer is told — instead of inserting a
--     second one. Its checks, locking and grants are unchanged.
--   * Orders that are not cancelled but still carry a cancelled_at (from an
--     admin restoring one before this migration) are cleared once.
--
-- Security model unchanged: no policy or grant on public.orders or
-- public.notifications is added or altered. Customers still reach
-- cancellation only through cancel_order(), and the admin policy from 009 is
-- left as it is.
--
-- Orders an admin cancelled before this migration keep a null cancelled_at:
-- the time they were cancelled was never recorded, so none is invented.
--
-- Idempotent: the functions are created or replaced, the trigger is dropped if
-- present before being created, and the clean-up only touches rows that
-- still need it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- cancelled_at follows status
-- -----------------------------------------------------------------------------

create or replace function public.sync_order_cancelled_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'cancelled' then
    -- Entering the cancelled state stamps it; staying cancelled keeps the stamp.
    if old.status is distinct from 'cancelled' then
      new.cancelled_at := now();
    end if;
  else
    new.cancelled_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_sync_cancelled_at on public.orders;
create trigger orders_sync_cancelled_at
  before update on public.orders
  for each row execute function public.sync_order_cancelled_at();

-- Trigger functions are never called directly.
revoke all on function public.sync_order_cancelled_at() from public, anon, authenticated;

-- One-off clean-up: a stamp on an order that isn't cancelled is stale.
update public.orders
set cancelled_at = null
where status <> 'cancelled' and cancelled_at is not null;

-- -----------------------------------------------------------------------------
-- cancel_order(order_number) → (order_number, status)
--
-- As in 012, except for the notification: an order has at most one
-- "Order cancelled" notification, so cancelling again (after an admin
-- restored the order) refreshes that one instead of adding a second.
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

  -- cancelled_at is stamped by the orders_sync_cancelled_at trigger.
  update public.orders o
  set status = 'cancelled'
  where o.id = v_order.id;

  -- "Order cancelled" notification, e.g. 'Order OD10000000001 has been cancelled.'
  -- A second cancellation of the same order reuses its notification, moved
  -- to now and unread again.
  insert into public.notifications (user_id, order_id, type, title, body)
  values (
    v_user_id,
    v_order.id,
    'order_cancelled',
    'Order cancelled',
    'Order ' || v_order.order_number || ' has been cancelled.'
  )
  on conflict (order_id, type) where order_id is not null
  do update set
    title      = excluded.title,
    body       = excluded.body,
    created_at = now(),
    read_at    = null;

  return query
  select o.order_number, o.status
  from public.orders o
  where o.id = v_order.id;
end;
$$;

-- Unchanged from 012; repeated so this migration stands on its own.
revoke all on function public.cancel_order(text) from public, anon;
grant execute on function public.cancel_order(text) to authenticated;
