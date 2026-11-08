-- =============================================================================
-- Cshoe — saved designs
--
-- A customer's saved customiser designs ("My Designs"): one row per design,
-- owned by the (anonymous guest) user who saved it. A design is the same
-- { partId: colourId } object a customised Bag item carries (cart_items.
-- customization); it is saved apart from the Bag, so a design can be kept,
-- reopened and edited without buying it, and adding it to the Bag copies it.
--
-- Additive only: a new table with its own index, trigger, RLS policies and
-- grants. No existing table, function or policy is changed.
--
-- Idempotent: the table and index are created if missing, and the trigger and
-- policies are dropped and created again, so re-running changes nothing.
-- =============================================================================

create table if not exists public.saved_designs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  -- Products have text ids ('nike-air-force'). A design follows a renamed
  -- product, but a product with saved designs can't be deleted: designs are
  -- customers' own work and must never disappear because of a catalogue change.
  product_id    text not null references public.products (id) on update cascade on delete restrict,
  -- The customer's own name for the design; null when they didn't give one.
  name          text check (name is null or (btrim(name) <> '' and char_length(name) <= 60)),
  -- { partId: colourId }, as cart_items.customization, but never null: a
  -- saved design always has at least one colour. Every value is a colour id
  -- (a string), and the object stays small (12 parts are about 300 bytes).
  -- Whether the parts and colours still exist is checked by the app before
  -- saving, and by place_order() when the design is ordered from the Bag.
  customization jsonb not null check (
    jsonb_typeof(customization) = 'object'
    and customization <> '{}'::jsonb
    and not jsonb_path_exists(customization, '$.* ? (@.type() != "string")')
    and octet_length(customization::text) <= 4096
  ),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- "My Designs": a user's designs, most recently changed first.
create index if not exists saved_designs_user_id_updated_at_idx
  on public.saved_designs (user_id, updated_at desc);

-- Deleting or renaming a product finds its designs without a full scan.
create index if not exists saved_designs_product_id_idx
  on public.saved_designs (product_id);

drop trigger if exists saved_designs_set_updated_at on public.saved_designs;
create trigger saved_designs_set_updated_at
  before update on public.saved_designs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row level security: each user sees and changes only their own designs.
-- Anonymous guests sign in (Supabase Anonymous Sign-ins), so they act as
-- 'authenticated' with their own auth.uid(), exactly as for the Bag.
-- -----------------------------------------------------------------------------
alter table public.saved_designs enable row level security;

drop policy if exists "Read own designs" on public.saved_designs;
create policy "Read own designs" on public.saved_designs
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Add own designs" on public.saved_designs;
create policy "Add own designs" on public.saved_designs
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Update own designs" on public.saved_designs;
create policy "Update own designs" on public.saved_designs
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Delete own designs" on public.saved_designs;
create policy "Delete own designs" on public.saved_designs
  for delete to authenticated using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Privileges (defence in depth on top of RLS; this project grants table access
-- explicitly — see 002_grants.sql).
-- -----------------------------------------------------------------------------

-- Nothing for visitors without a session; no truncate for anyone signed in.
revoke all on public.saved_designs from anon;
revoke truncate on public.saved_designs from authenticated;

-- Read, add and delete your own designs; edit only a design's name and colours
-- (its owner and shoe never change — save a new design for another shoe).
grant select, insert, delete on public.saved_designs to authenticated;
grant update (name, customization) on public.saved_designs to authenticated;

-- Service role (server-side / seeding only; bypasses RLS). Never used in the browser.
grant all on public.saved_designs to service_role;
