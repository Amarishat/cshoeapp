-- =============================================================================
-- Cshoe — admins can read every order
--
-- public.orders and public.order_items are readable only by the customer who
-- owns them ("Read own orders" / "Read own order items", 001), so the admin
-- Orders screen sees nothing. These policies add a second, admin-only way in:
-- permissive policies are OR-ed, so customers keep exactly the access they
-- have today and admins can read the rest.
--
-- Read only. No insert, update or delete is granted here — orders are still
-- written only by public.place_order(), and nothing in the app edits them.
-- The select privilege these policies work through was already granted to
-- authenticated in 002.
--
-- Idempotent: each policy is dropped if present before being created.
-- =============================================================================

drop policy if exists "Admins read all orders" on public.orders;
create policy "Admins read all orders" on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins read all order items" on public.order_items;
create policy "Admins read all order items" on public.order_items
  for select to authenticated using (public.is_admin());
