-- =============================================================================
-- Cshoe — admin-only brand edits
--
-- 006 gave admins write access to public.products. public.brands is still
-- read-only for every client principal (002 grants select; 001 has only the
-- "Catalogue is public" select policy), so the admin Brands editor cannot
-- save until this runs.
--
-- Editing only: no insert or delete is granted, because the admin has no
-- create-or-delete brand screen. Customers are unaffected — they keep the
-- same public read and gain nothing.
--
-- Idempotent: the grant and the policy are re-runnable.
-- =============================================================================

-- Lets an update request reach row level security; is_admin() (006) decides.
grant update on public.brands to authenticated;

drop policy if exists "Admins update brands" on public.brands;
create policy "Admins update brands" on public.brands
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
