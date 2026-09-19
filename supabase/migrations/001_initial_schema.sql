-- =============================================================================
-- Cshoe — initial schema
--
-- Catalogue (brands, products, images, sizes, reviews, customiser setup) is
-- public read-only; it is written only by seed scripts / the service role,
-- which bypasses RLS. User data (profile, addresses, wishlist, cart, orders,
-- notifications) is visible only to its owner. Orders are created only by
-- public.place_order(), never by direct inserts from the client.
--
-- Money is whole rupees (integer). Product/brand ids keep the app's existing
-- slug-style ids (e.g. 'nike-air-force', 'nike-sabrina-2-ep').
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

create type public.audience as enum ('men', 'women', 'kids');
create type public.address_type as enum ('home', 'office', 'other');
create type public.order_status as enum ('confirmed', 'shipped', 'out_for_delivery', 'delivered');
create type public.payment_method as enum ('card', 'netbanking', 'wallets', 'upi', 'cod');
create type public.upi_app as enum ('gpay', 'phonepe', 'paytm');
create type public.image_kind as enum ('photo', 'cutout');
create type public.notification_type as enum ('order_confirmed');

-- -----------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- -----------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =============================================================================
-- Catalogue
-- =============================================================================

create table public.brands (
  id          text primary key
              check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (btrim(name) <> ''),
  logo_url    text not null,
  logo_width  numeric(5,2) not null check (logo_width > 0),
  logo_height numeric(5,2) not null check (logo_height > 0),
  sort_order  smallint not null default 0
);

create table public.products (
  id                  text primary key
                      check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  slug                text not null unique
                      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  brand_id            text not null references public.brands (id) on update cascade,
  name                text not null check (btrim(name) <> ''),
  short_name          text,
  category            text not null,
  audience            public.audience not null,
  price               integer not null check (price > 0),
  -- Display only (e.g. '10% OFF'); never applied to the price.
  discount_label      text,
  rating              numeric(2,1) not null default 0 check (rating between 0 and 5),
  description_excerpt text,
  description_rest    text,
  -- Product Information rows: [{ "label": ..., "value": ... }]
  details             jsonb check (details is null or jsonb_typeof(details) = 'array'),
  -- CardImage: { src, box, crop?, flip?, shadow? } (Figma placement in the card)
  card_image          jsonb not null check (jsonb_typeof(card_image) = 'object' and card_image ? 'src'),
  -- Transparent cut-out used in Bag / order lines.
  cutout_url          text,
  cutout_frame        jsonb check (cutout_frame is null or jsonb_typeof(cutout_frame) = 'object'),
  has_product_page    boolean not null default false,
  is_customizable     boolean not null default false,
  -- e.g. {top_picks, trending} — Home rails.
  home_sections       text[] not null default '{}',
  created_at          timestamptz not null default now()
);

create index products_brand_id_idx on public.products (brand_id);
create index products_audience_idx on public.products (audience);

create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id text not null references public.products (id) on update cascade on delete cascade,
  src        text not null,
  alt        text not null,
  kind       public.image_kind not null,
  -- Cut-out placement inside the thumbnail tile.
  box        jsonb check (box is null or jsonb_typeof(box) = 'array'),
  sort_order smallint not null,
  unique (product_id, sort_order)
);

create table public.product_sizes (
  product_id text not null references public.products (id) on update cascade on delete cascade,
  -- UK/India size; whole or half sizes (US = UK + 0.5 is derived in the app).
  size_uk    numeric(3,1) not null check (size_uk > 0 and size_uk * 2 = trunc(size_uk * 2)),
  is_default boolean not null default false,
  sort_order smallint not null default 0,
  primary key (product_id, size_uk)
);

-- At most one default size per product.
create unique index product_sizes_one_default_idx
  on public.product_sizes (product_id) where is_default;

-- Profiles are declared before reviews (reviews may reference a user).
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  city       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references public.products (id) on update cascade on delete cascade,
  -- Null for seeded reviews.
  user_id     uuid references public.profiles (id) on delete set null,
  author_name text not null check (btrim(author_name) <> ''),
  rating      smallint not null check (rating between 1 and 5),
  body        text not null,
  created_at  timestamptz not null default now()
);

create index product_reviews_product_id_idx on public.product_reviews (product_id);
create index product_reviews_user_id_idx on public.product_reviews (user_id);

-- One customiser setup per customisable product. Price and sizes come from
-- products / product_sizes; this table holds only what the customiser adds.
create table public.customization_configs (
  product_id       text primary key references public.products (id) on update cascade on delete cascade,
  title            text not null,
  -- Shown for customised Bag / order lines, e.g. 'Custom Men’s Shoes'.
  display_category text not null,
  wordmark         text not null,
  -- Image used for customised Bag / order lines.
  image_url        text not null,
  -- ViewerAngle[] (Figma viewer geometry); at least one angle.
  angles           jsonb not null check (jsonb_typeof(angles) = 'array' and jsonb_array_length(angles) >= 1)
);

create table public.customization_parts (
  product_id text not null references public.customization_configs (product_id) on update cascade on delete cascade,
  id         text not null check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null,
  sort_order smallint not null,
  primary key (product_id, id),
  unique (product_id, sort_order)
);

create table public.customization_colours (
  product_id text not null references public.customization_configs (product_id) on update cascade on delete cascade,
  id         text not null check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null,
  hex        char(7) not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order smallint not null,
  primary key (product_id, id),
  unique (product_id, sort_order)
);

-- =============================================================================
-- User data
-- =============================================================================

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile row when a Supabase Auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, city)
  values (
    new.id,
    coalesce(btrim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'city'), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  full_name  text not null check (btrim(full_name) <> ''),
  phone      text not null check (phone ~ '^[0-9]{10}$'),
  pincode    text not null check (pincode ~ '^[0-9]{6}$'),
  state      text not null check (btrim(state) <> ''),
  city       text not null check (btrim(city) <> ''),
  area       text not null check (btrim(area) <> ''),
  street     text not null check (btrim(street) <> ''),
  type       public.address_type not null default 'home',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index addresses_user_id_idx on public.addresses (user_id);

-- At most one default address per user.
create unique index addresses_one_default_per_user_idx
  on public.addresses (user_id) where is_default;

create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

create table public.wishlist_items (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id text not null references public.products (id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index wishlist_items_product_id_idx on public.wishlist_items (product_id);

create table public.cart_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  product_id    text not null,
  size_uk       numeric(3,1) not null,
  quantity      integer not null check (quantity >= 1),
  -- Bag checkbox: included in the next order.
  is_selected   boolean not null default true,
  -- { partId: colourId } for customised items (never an empty object);
  -- null for plain items.
  customization jsonb check (
    customization is null
    or (jsonb_typeof(customization) = 'object' and customization <> '{}'::jsonb)
  ),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Only sizes the product actually offers.
  foreign key (product_id, size_uk)
    references public.product_sizes (product_id, size_uk) on update cascade on delete cascade
);

create index cart_items_user_id_idx on public.cart_items (user_id);

-- Plain items merge: one row per user + product + size. Customised items are
-- excluded from this index, so each customised design stays its own line.
create unique index cart_items_plain_unique_idx
  on public.cart_items (user_id, product_id, size_uk) where customization is null;

create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

-- Display order numbers like Figma's 'OD99997989899' (OD + 11 digits).
create sequence public.order_number_seq start with 10000000001;

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique
                   default ('OD' || nextval('public.order_number_seq'))
                   check (order_number ~ '^OD[0-9]+$'),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  status           public.order_status not null default 'confirmed',
  created_at       timestamptz not null default now(),
  -- The address used; the ship_* columns are the snapshot actually shown.
  address_id       uuid references public.addresses (id) on delete set null,
  ship_full_name   text not null,
  ship_phone       text not null check (ship_phone ~ '^[0-9]{10}$'),
  ship_pincode     text not null check (ship_pincode ~ '^[0-9]{6}$'),
  ship_state       text not null,
  ship_city        text not null,
  ship_area        text not null,
  ship_street      text not null,
  ship_type        public.address_type not null,
  payment_method   public.payment_method not null,
  upi_app          public.upi_app,
  subtotal         integer not null check (subtotal >= 0),
  discount         integer not null default 0 check (discount >= 0),
  delivery_fee     integer not null check (delivery_fee >= 0),
  platform_fee     integer not null check (platform_fee >= 0),
  total            integer not null check (total >= 0),
  -- Null in V1: the app shows its fixed estimate.
  expected_delivery date,
  constraint orders_total_matches
    check (total = subtotal - discount + delivery_fee + platform_fee),
  constraint orders_upi_app_required
    check (payment_method <> 'upi' or upi_app is not null)
);

alter sequence public.order_number_seq owned by public.orders.order_number;

create index orders_user_id_created_at_idx on public.orders (user_id, created_at desc);
create index orders_address_id_idx on public.orders (address_id);

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  -- Kept if possible; order history survives the product being removed.
  product_id       text references public.products (id) on update cascade on delete set null,
  -- Snapshot of what was bought.
  product_name     text not null,
  product_category text not null,
  image_url        text not null,
  image_fit        text not null check (image_fit in ('cover', 'contain')),
  size_uk          numeric(3,1) not null check (size_uk > 0),
  quantity         integer not null check (quantity >= 1),
  unit_price       integer not null check (unit_price >= 0),
  is_customized    boolean not null default false
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

create table public.order_item_customizations (
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  part_id       text not null,
  part_name     text not null,
  colour_id     text not null,
  colour_name   text not null,
  colour_hex    char(7) not null check (colour_hex ~ '^#[0-9A-Fa-f]{6}$'),
  primary key (order_item_id, part_id)
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  order_id   uuid references public.orders (id) on delete cascade,
  type       public.notification_type not null,
  title      text not null,
  body       text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);
-- One notification of each type per order.
create unique index notifications_order_type_idx
  on public.notifications (order_id, type) where order_id is not null;

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.brands                    enable row level security;
alter table public.products                  enable row level security;
alter table public.product_images            enable row level security;
alter table public.product_sizes             enable row level security;
alter table public.product_reviews           enable row level security;
alter table public.customization_configs     enable row level security;
alter table public.customization_parts       enable row level security;
alter table public.customization_colours     enable row level security;
alter table public.profiles                  enable row level security;
alter table public.addresses                 enable row level security;
alter table public.wishlist_items            enable row level security;
alter table public.cart_items                enable row level security;
alter table public.orders                    enable row level security;
alter table public.order_items               enable row level security;
alter table public.order_item_customizations enable row level security;
alter table public.notifications             enable row level security;

-- Catalogue: anyone may read; no client writes (no write policies, and
-- write privileges are revoked below as a second layer).
create policy "Catalogue is public" on public.brands                for select to anon, authenticated using (true);
create policy "Catalogue is public" on public.products              for select to anon, authenticated using (true);
create policy "Catalogue is public" on public.product_images        for select to anon, authenticated using (true);
create policy "Catalogue is public" on public.product_sizes         for select to anon, authenticated using (true);
create policy "Catalogue is public" on public.product_reviews       for select to anon, authenticated using (true);
create policy "Catalogue is public" on public.customization_configs for select to anon, authenticated using (true);
create policy "Catalogue is public" on public.customization_parts   for select to anon, authenticated using (true);
create policy "Catalogue is public" on public.customization_colours for select to anon, authenticated using (true);

-- Profile: read and update your own (created by the auth trigger).
create policy "Read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Addresses, wishlist, cart: full control of your own rows only.
create policy "Read own addresses" on public.addresses
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Add own addresses" on public.addresses
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Update own addresses" on public.addresses
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Delete own addresses" on public.addresses
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Read own wishlist" on public.wishlist_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Add to own wishlist" on public.wishlist_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Remove from own wishlist" on public.wishlist_items
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Read own cart" on public.cart_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Add to own cart" on public.cart_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Update own cart" on public.cart_items
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Remove from own cart" on public.cart_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- Orders: read-only for their owner; created only by place_order().
create policy "Read own orders" on public.orders
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Read own order items" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.user_id = (select auth.uid())
  ));
create policy "Read own order item customizations" on public.order_item_customizations
  for select to authenticated
  using (exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_customizations.order_item_id and o.user_id = (select auth.uid())
  ));

-- Notifications: read your own and mark them read (only read_at is updatable).
create policy "Read own notifications" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Mark own notifications read" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Privileges (defence in depth on top of RLS). Supabase grants anon and
-- authenticated full table privileges by default; narrow them here.
-- -----------------------------------------------------------------------------

-- Catalogue: read only.
revoke insert, update, delete, truncate on
  public.brands, public.products, public.product_images, public.product_sizes,
  public.product_reviews, public.customization_configs, public.customization_parts,
  public.customization_colours
  from anon, authenticated;

-- User tables: nothing for anonymous visitors.
revoke all on
  public.profiles, public.addresses, public.wishlist_items, public.cart_items,
  public.orders, public.order_items, public.order_item_customizations, public.notifications
  from anon;

-- No truncate for signed-in users anywhere.
revoke truncate on
  public.profiles, public.addresses, public.wishlist_items, public.cart_items,
  public.orders, public.order_items, public.order_item_customizations, public.notifications
  from authenticated;

-- Profiles: created by the trigger; users may change only their name and city.
revoke insert, update, delete on public.profiles from authenticated;
grant update (first_name, city) on public.profiles to authenticated;

-- Wishlist rows are added or removed, never edited.
revoke update on public.wishlist_items from authenticated;

-- Orders are written only by place_order() (security definer).
revoke insert, update, delete on
  public.orders, public.order_items, public.order_item_customizations
  from authenticated;

-- Notifications: created by place_order(); users may only set read_at.
revoke insert, update, delete on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- The order-number sequence is used only inside place_order().
revoke all on sequence public.order_number_seq from anon, authenticated;

-- =============================================================================
-- place_order(address_id, upi_app) → order_number
--
-- Places an order from the current user's selected Bag items, in one
-- transaction (a single function call is atomic: any error rolls back all of
-- it). Prices always come from the database, never from the client.
-- =============================================================================

create function public.place_order(p_address_id uuid, p_upi_app public.upi_app)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_delivery_fee constant integer := 1250;
  c_platform_fee constant integer := 9;

  v_user_id      uuid := auth.uid();
  v_address      public.addresses%rowtype;
  v_cart_ids     uuid[];
  v_subtotal     integer;
  v_item_count   integer;
  v_order_id     uuid;
  v_order_number text;
  v_total        integer;
  v_first_name   text;
  v_item_id      uuid;
  v_bad_parts    integer;
  r              record;
begin
  if v_user_id is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  -- The address must belong to the caller.
  select * into v_address
  from public.addresses a
  where a.id = p_address_id and a.user_id = v_user_id;
  if not found then
    raise exception 'Address not found' using errcode = 'P0002';
  end if;

  -- Lock the caller's selected Bag items and fix the exact set being ordered.
  -- Every later statement uses only these ids, so items added or selected
  -- while this runs are not ordered, and a second concurrent call waits and
  -- then finds these items gone.
  v_cart_ids := array(
    select ci.id
    from public.cart_items ci
    where ci.user_id = v_user_id and ci.is_selected
    order by ci.created_at, ci.id
    for update
  );

  select count(*), coalesce(sum(p.price * ci.quantity), 0)
  into v_item_count, v_subtotal
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any (v_cart_ids);

  if v_item_count = 0 then
    raise exception 'No selected items in the bag' using errcode = 'P0002';
  end if;

  -- Customised items: the product must have a customiser, and every
  -- part/colour must exist in it.
  if exists (
    select 1
    from public.cart_items ci
    left join public.customization_configs cc on cc.product_id = ci.product_id
    where ci.id = any (v_cart_ids)
      and ci.customization is not null and cc.product_id is null
  ) then
    raise exception 'Customised item for a product without a customiser' using errcode = '22023';
  end if;

  select count(*) into v_bad_parts
  from public.cart_items ci
  cross join lateral jsonb_each(ci.customization) as sel(part_id, colour_id)
  left join public.customization_parts cp
    on cp.product_id = ci.product_id and cp.id = sel.part_id
  left join public.customization_colours cl
    on cl.product_id = ci.product_id and cl.id = (sel.colour_id #>> '{}')
  where ci.id = any (v_cart_ids) and ci.customization is not null
    and (cp.id is null or cl.id is null or jsonb_typeof(sel.colour_id) <> 'string');

  if v_bad_parts > 0 then
    raise exception 'Invalid customisation' using errcode = '22023';
  end if;

  v_total := v_subtotal + c_delivery_fee + c_platform_fee;

  insert into public.orders (
    user_id, status, address_id,
    ship_full_name, ship_phone, ship_pincode, ship_state, ship_city, ship_area, ship_street, ship_type,
    payment_method, upi_app,
    subtotal, discount, delivery_fee, platform_fee, total
  )
  values (
    v_user_id, 'confirmed', v_address.id,
    v_address.full_name, v_address.phone, v_address.pincode, v_address.state,
    v_address.city, v_address.area, v_address.street, v_address.type,
    'upi', p_upi_app,
    v_subtotal, 0, c_delivery_fee, c_platform_fee, v_total
  )
  returning id, order_number into v_order_id, v_order_number;

  -- One order item per selected Bag item, with a display snapshot.
  -- Customised lines show the customiser's title/category/image (as the Bag
  -- does); plain lines show the product, using its cut-out when it has one.
  for r in
    select
      ci.id as cart_item_id,
      ci.product_id,
      ci.size_uk,
      ci.quantity,
      ci.customization,
      p.price,
      case when ci.customization is not null then cc.title else p.name end as product_name,
      case when ci.customization is not null then cc.display_category else p.category end as product_category,
      case
        when ci.customization is not null then cc.image_url
        when p.cutout_url is not null then p.cutout_url
        when cc.image_url is not null then cc.image_url
        else p.card_image ->> 'src'
      end as image_url,
      case
        when ci.customization is not null then 'contain'
        when p.cutout_url is not null then 'cover'
        else 'contain'
      end as image_fit
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    left join public.customization_configs cc on cc.product_id = ci.product_id
    where ci.id = any (v_cart_ids)
    order by ci.created_at, ci.id
  loop
    -- The first line names the order in the notification (as in the app).
    if v_first_name is null then
      v_first_name := r.product_name;
    end if;

    insert into public.order_items (
      order_id, product_id, product_name, product_category, image_url, image_fit,
      size_uk, quantity, unit_price, is_customized
    )
    values (
      v_order_id, r.product_id, r.product_name, r.product_category, r.image_url, r.image_fit,
      r.size_uk, r.quantity, r.price, r.customization is not null
    )
    returning id into v_item_id;

    if r.customization is not null then
      insert into public.order_item_customizations (
        order_item_id, part_id, part_name, colour_id, colour_name, colour_hex
      )
      select v_item_id, cp.id, cp.name, cl.id, cl.name, cl.hex
      from jsonb_each_text(r.customization) as sel(part_id, colour_id)
      join public.customization_parts cp
        on cp.product_id = r.product_id and cp.id = sel.part_id
      join public.customization_colours cl
        on cl.product_id = r.product_id and cl.id = sel.colour_id;
    end if;
  end loop;

  -- Remove exactly the items that were ordered.
  delete from public.cart_items ci
  where ci.id = any (v_cart_ids);

  -- "Order confirmed" notification, e.g.
  -- 'Order OD10000000001 · Nike Sabrina 2 EP + 1 more · ₹38,257'.
  insert into public.notifications (user_id, order_id, type, title, body)
  values (
    v_user_id,
    v_order_id,
    'order_confirmed',
    'Order confirmed',
    'Order ' || v_order_number
      || ' · ' || coalesce(v_first_name, 'Your items')
      || case when v_item_count > 1 then ' + ' || (v_item_count - 1) || ' more' else '' end
      -- Indian digit grouping, e.g. ₹1,23,45,678.
      || ' · ₹' || to_char(v_total, 'FM9,99,99,99,999')
  );

  return v_order_number;
end;
$$;

-- Only signed-in users may place orders; functions are executable by PUBLIC
-- by default, so revoke that first.
revoke all on function public.place_order(uuid, public.upi_app) from public, anon;
grant execute on function public.place_order(uuid, public.upi_app) to authenticated;

-- Trigger functions are never called directly.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
