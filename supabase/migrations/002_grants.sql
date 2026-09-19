-- =============================================================================
-- Cshoe — explicit table privileges
--
-- 001_initial_schema.sql assumed Supabase's automatic grants on new public
-- tables; this project does not add them, so API requests failed with
-- 42501 "permission denied". These grants let requests reach the existing
-- RLS policies, which still decide which rows each user can see or change.
-- Nothing here is granted beyond what those policies allow; anon only reads
-- the catalogue.
-- =============================================================================

grant usage on schema public to anon, authenticated;

-- Catalogue: public read-only.
grant select on
  public.brands,
  public.products,
  public.product_images,
  public.product_sizes,
  public.product_reviews,
  public.customization_configs,
  public.customization_parts,
  public.customization_colours
  to anon, authenticated;

-- Profile: read your own; change only your name and city.
grant select on public.profiles to authenticated;
grant update (first_name, city) on public.profiles to authenticated;

-- Addresses and bag: full control of your own rows (RLS).
grant select, insert, update, delete on public.addresses to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;

-- Wishlist: rows are added or removed, never edited.
grant select, insert, delete on public.wishlist_items to authenticated;

-- Orders: read-only; created only by public.place_order().
grant select on
  public.orders,
  public.order_items,
  public.order_item_customizations
  to authenticated;

-- Notifications: read your own; only read_at can be changed.
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Service role (server-side / seeding only; bypasses RLS). Never used in the browser.
grant all on all tables in schema public to service_role;
grant usage on sequence public.order_number_seq to service_role;
