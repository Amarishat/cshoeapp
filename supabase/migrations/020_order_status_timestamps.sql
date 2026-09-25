-- =============================================================================
-- Cshoe — when an order was shipped, out for delivery and delivered
--
-- An order only recorded when it was placed (created_at) and, since 012/013,
-- when it was cancelled (cancelled_at). The customer's tracker and the admin
-- screens could say that an order had shipped or been delivered, but not
-- when. This adds one timestamp per fulfilment stage:
--
--   public.orders.shipped_at           — when it entered 'shipped'
--   public.orders.out_for_delivery_at  — when it entered 'out_for_delivery'
--   public.orders.delivered_at         — when it entered 'delivered'
--
-- All nullable: null means "not reached", or "reached before this migration
-- with no record of when" (see the backfill below).
--
-- They are stamped by a before-update trigger on public.orders, whatever
-- makes the change — today that is only public.admin_set_order_status()
-- (016/019), which is left exactly as it is. Entering a stage stamps its time
-- if none is recorded yet; an existing time is never overwritten or cleared,
-- so moving on (e.g. shipped → out for delivery) keeps the earlier stamps.
-- cancelled_at is not touched here: orders_sync_cancelled_at (013) still
-- keeps it, and a cancelled order (only ever cancelled from 'confirmed')
-- never reaches these stages.
--
-- Backfill: existing orders get a time only where a matching status
-- notification (019) exists — its created_at is the moment of that change,
-- since each status type is written once per order and transitions only move
-- forward. Orders moved before 019 keep null: no date is invented.
-- The notification type is compared as text, so this migration also runs
-- (and simply finds nothing to backfill) where 019 hasn't been applied.
--
-- No grants or policies: clients have no write access to public.orders, and
-- the existing read policies cover the new columns.
--
-- Idempotent: the columns are added only if missing, the function is created
-- or replaced, the trigger is dropped if present before being created, and
-- the backfill only fills times that are still null.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The columns
-- -----------------------------------------------------------------------------

alter table public.orders
  add column if not exists shipped_at          timestamptz,
  add column if not exists out_for_delivery_at timestamptz,
  add column if not exists delivered_at        timestamptz;

-- -----------------------------------------------------------------------------
-- Stamp each stage when the order enters it
-- -----------------------------------------------------------------------------

create or replace function public.stamp_order_status_times()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only on entering a stage (the status changed to it), and only if no time
  -- is recorded yet; existing times are kept as they are.
  if new.status is distinct from old.status then
    if new.status = 'shipped' and new.shipped_at is null then
      new.shipped_at := now();
    elsif new.status = 'out_for_delivery' and new.out_for_delivery_at is null then
      new.out_for_delivery_at := now();
    elsif new.status = 'delivered' and new.delivered_at is null then
      new.delivered_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_stamp_status_times on public.orders;
create trigger orders_stamp_status_times
  before update on public.orders
  for each row execute function public.stamp_order_status_times();

-- Trigger functions are never called directly.
revoke all on function public.stamp_order_status_times() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Backfill from the status notifications (019), where they exist
--
-- (Both before-update triggers run on these updates; the status doesn't
-- change, so neither stamps or clears anything.)
-- -----------------------------------------------------------------------------

update public.orders o
set shipped_at = n.created_at
from public.notifications n
where n.order_id = o.id
  and n.type::text = 'order_shipped'
  and o.shipped_at is null;

update public.orders o
set out_for_delivery_at = n.created_at
from public.notifications n
where n.order_id = o.id
  and n.type::text = 'order_out_for_delivery'
  and o.out_for_delivery_at is null;

update public.orders o
set delivered_at = n.created_at
from public.notifications n
where n.order_id = o.id
  and n.type::text = 'order_delivered'
  and o.delivered_at is null;
