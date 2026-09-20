-- =============================================================================
-- Cshoe — admin role and admin-only product writes
--
-- Records the admin security changes applied by hand in the Supabase SQL
-- editor, so the migrations describe the whole database.
--
-- Until now the catalogue was read-only for every client principal (002):
-- anon and authenticated could only select. This adds a role marker on the
-- profile, a helper that answers "is the current user an admin?", and the
-- three write policies on public.products that use it. Customers are
-- unaffected: a guest's profile keeps role 'user', and 'role' stays outside
-- the columns a user may update (002 grants update only on first_name, city),
-- so no one can make themselves an admin from the app.
--
-- Idempotent: the column, constraint, function, grants and policies are all
-- created or replaced, so re-running changes nothing. (If the policies were
-- applied by hand under different names, drop those first — Postgres would
-- otherwise keep both, and permissive policies are OR-ed together.)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Role marker on the profile
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

-- The one admin account (created in Supabase Auth; the profile row comes from
-- the handle_new_user trigger). No-op if that user doesn't exist here.
update public.profiles
   set role = 'admin'
 where id = '1d574244-2a32-4278-9b28-4877aca72135'::uuid;

-- ---------------------------------------------------------------------------
-- Is the caller an admin?
-- ---------------------------------------------------------------------------
-- security definer so the check can read public.profiles without depending on
-- that table's own row level security (and without recursing through it).
-- Anonymous guests have no profile row with role 'admin', so they get false.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = (select auth.uid())
       and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Product writes: privileges, then the policies that decide who may use them
-- ---------------------------------------------------------------------------
-- The grant lets requests reach row level security; is_admin() is what
-- actually allows the write. Reads stay public ("Catalogue is public", 001).
grant insert, update, delete on public.products to authenticated;

drop policy if exists "Admins add products" on public.products;
create policy "Admins add products" on public.products
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins update products" on public.products;
create policy "Admins update products" on public.products
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins delete products" on public.products;
create policy "Admins delete products" on public.products
  for delete to authenticated using (public.is_admin());
