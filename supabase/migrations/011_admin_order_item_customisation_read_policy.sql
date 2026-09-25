-- =============================================================================
-- Cshoe — admins can read every order item's customisation
--
-- 008 let admins read every order and order item, but not the third order
-- table: public.order_item_customizations is still readable only by the
-- customer who owns the order ("Read own order item customizations", 001).
-- An admin looking at someone else's customised order line therefore sees
-- the line but none of its chosen parts and colours.
--
-- This adds the matching admin-only way in, the same shape 008 used for
-- orders and order items: permissive policies are OR-ed, so customers keep
-- exactly the access they have today and admins can read the rest, through
-- public.is_admin() (006).
--
-- Read only. No insert, update or delete is granted here — customisation
-- rows are still written only by public.place_order(). The select privilege
-- was already granted to authenticated in 002; it is repeated here so this
-- migration stands on its own, and re-granting is a no-op.
--
-- No schema change: no table, column, constraint or index is altered here,
-- and the existing owner policy is left untouched.
--
-- Idempotent: the grant is re-runnable and the policy is dropped if present
-- before being created.
-- =============================================================================

grant select on public.order_item_customizations to authenticated;

drop policy if exists "Admins read all order item customizations" on public.order_item_customizations;
create policy "Admins read all order item customizations" on public.order_item_customizations
  for select to authenticated using (public.is_admin());
