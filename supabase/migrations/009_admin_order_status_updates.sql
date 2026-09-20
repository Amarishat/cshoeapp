-- =============================================================================
-- Cshoe — admins can move an order's status
--
-- Orders are created by public.place_order() and have never been updatable:
-- 002 grants only select on public.orders to authenticated, and 001 has no
-- update policy, so the admin status control could only be read-only. This
-- adds the narrowest write that fulfilment needs.
--
-- Two things hold the line, and both have to pass:
--   1. The privilege is column-level — update (status) only. Even an admin
--      cannot change the total, the discount or the shipping snapshot through
--      PostgREST: Postgres refuses the statement before row level security is
--      reached. No other column is granted here.
--   2. The policy is admin-only, through public.is_admin() (006), in both
--      using (which rows may be updated) and with check (what the row may
--      become). A customer or guest matches neither, so their update simply
--      affects no rows.
--
-- Customers are unaffected: they keep the same select on their own orders and
-- gain no write. Nothing in the customer app updates an order.
--
-- 008 (admin order reads) should be applied first, or an admin will be able
-- to update only the orders they placed themselves — the rows they can see.
--
-- Idempotent: the grant and the policy are both re-runnable.
-- =============================================================================

-- Lets an update request on this one column reach row level security;
-- public.is_admin() (006) is what actually allows it.
grant update (status) on public.orders to authenticated;

drop policy if exists "Admins update order status" on public.orders;
create policy "Admins update order status" on public.orders
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
