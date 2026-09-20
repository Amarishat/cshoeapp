-- =============================================================================
-- Cshoe — admin-only customiser edits
--
-- The three customiser tables are still read-only for every client principal:
-- 002 grants select on all of them, and 001 gives each one the single policy
-- "Catalogue is public" (select to anon, authenticated). The admin Customizer
-- screens can therefore only look, never save.
--
-- This grants the writes and gates them on public.is_admin() (006), the same
-- shape 006 used for products and 007 for brands. Three tables only:
--   public.customization_configs   one setup per customisable product
--   public.customization_parts     the parts, in sort order
--   public.customization_colours   the colours, per product
-- Nothing else is touched — public.products, public.brands and the order
-- tables keep exactly the policies they already have.
--
-- Customers are unaffected. The existing "Catalogue is public" select
-- policies are left alone, so anon and authenticated keep reading the
-- customiser exactly as before; permissive policies are OR-ed, and these new
-- ones only ever add write access for an admin. Deletes cascade within the
-- customiser (parts and colours reference customization_configs on delete
-- cascade), so removing a config removes its own parts and colours and
-- nothing beyond them.
--
-- No schema change: no table, column, constraint or index is altered here.
--
-- Idempotent: the grants are re-runnable and each policy is dropped if
-- present before being created.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Privileges — these only let a request reach row level security
-- ---------------------------------------------------------------------------
grant insert, update, delete on
  public.customization_configs,
  public.customization_parts,
  public.customization_colours
  to authenticated;

-- ---------------------------------------------------------------------------
-- Policies — public.is_admin() is what actually allows the write
-- ---------------------------------------------------------------------------
-- Configs
drop policy if exists "Admins add customizer configs" on public.customization_configs;
create policy "Admins add customizer configs" on public.customization_configs
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins update customizer configs" on public.customization_configs;
create policy "Admins update customizer configs" on public.customization_configs
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins delete customizer configs" on public.customization_configs;
create policy "Admins delete customizer configs" on public.customization_configs
  for delete to authenticated using (public.is_admin());

-- Parts
drop policy if exists "Admins add customizer parts" on public.customization_parts;
create policy "Admins add customizer parts" on public.customization_parts
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins update customizer parts" on public.customization_parts;
create policy "Admins update customizer parts" on public.customization_parts
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins delete customizer parts" on public.customization_parts;
create policy "Admins delete customizer parts" on public.customization_parts
  for delete to authenticated using (public.is_admin());

-- Colours
drop policy if exists "Admins add customizer colours" on public.customization_colours;
create policy "Admins add customizer colours" on public.customization_colours
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins update customizer colours" on public.customization_colours;
create policy "Admins update customizer colours" on public.customization_colours
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins delete customizer colours" on public.customization_colours;
create policy "Admins delete customizer colours" on public.customization_colours
  for delete to authenticated using (public.is_admin());
