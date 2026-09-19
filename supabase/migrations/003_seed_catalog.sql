-- =============================================================================
-- Cshoe — catalogue seed
--
-- Generated from the app's current data files (lib/data/brands.ts,
-- products.ts, productDetails.ts, customizations.ts); nothing is invented.
-- Idempotent: re-running updates the same rows (ON CONFLICT … DO UPDATE)
-- and never creates duplicates. Catalogue only — no users, carts, wishlists,
-- addresses, orders or notifications, and no stock data.
--
-- - Sabrina 2 EP (product-page data) becomes one products row; its gallery,
--   sizes and reviews go to product_images / product_sizes / product_reviews.
-- - Nike Air Force: price lives only in products.price (₹9,999); its "10% OFF"
--   is the display-only discount_label; is_customizable = true; the
--   customiser's sizes (UK 6–11, default 7) are its product_sizes.
-- - Products without size data in the app (Coming Soon cards) get no sizes.
-- - Image-only ids (images, reviews) are deterministic md5-based UUIDs.
-- - ASSUMPTION: Sabrina 2 EP's audience is 'women'. The app data has no
--   audience for it (it is not in the Men/Women/Kids catalogue), but the
--   column is required. Change it here if another audience is intended.
-- - Home rails use home_sections ('top_picks', 'trending',
--   'trending_customisation'); the order within a rail is not stored.
-- =============================================================================

-- Brands (7) — Home brand row order
insert into public.brands (id, name, logo_url, logo_width, logo_height, sort_order)
values
  ('nike', 'Nike', '/images/brands/nike.svg', 24, 28, 1),
  ('adidas', 'Adidas', '/images/brands/adidas.svg', 30, 30, 2),
  ('puma', 'Puma', '/images/brands/puma.svg', 30, 30, 3),
  ('reebok', 'Reebok', '/images/brands/reebok.svg', 36, 45, 4),
  ('new-balance', 'New Balance', '/images/brands/new-balance.svg', 30, 14.43, 5),
  ('fila', 'Fila', '/images/brands/fila.svg', 30, 9.93, 6),
  ('asics', 'Asics', '/images/brands/asics.png', 38, 30, 7)
on conflict (id) do update set
  name = excluded.name,
  logo_url = excluded.logo_url,
  logo_width = excluded.logo_width,
  logo_height = excluded.logo_height,
  sort_order = excluded.sort_order;

-- Products (12)
insert into public.products (id, slug, brand_id, name, short_name, category, audience, price, discount_label, rating, description_excerpt, description_rest, details, card_image, cutout_url, cutout_frame, has_product_page, is_customizable, home_sections)
values
  ('nike-lite', 'nike-lite', 'nike', 'Nike Lite', null, 'Men’s Tennis Shoe', 'men', 9900, null, 5, null, null, null, '{"src":"/images/products/nike-court-lite-4.png","box":[2,7,182,152],"shadow":0.15}'::jsonb, null, null, false, false, array['top_picks']::text[]),
  ('nike-air-force', 'nike-air-force', 'nike', 'Nike Air Force', null, 'Men’s Shoe', 'men', 9999, '10% OFF', 5, null, null, null, '{"src":"/images/products/nike-air-force-1-mid.png","box":[16,15,157,152],"shadow":0.3}'::jsonb, null, null, false, true, array['top_picks']::text[]),
  ('adidas-nmd', 'adidas-nmd', 'adidas', 'Adidas NMD', null, 'Men’s Shoe', 'men', 8900, null, 5, null, null, null, '{"src":"/images/products/adidas-nmd-r1.png","box":[17,21,167,158],"flip":true}'::jsonb, null, null, false, false, array['top_picks']::text[]),
  ('puma-shuffle', 'puma-shuffle', 'puma', 'Puma Shuffle', null, 'Men’s Shoe', 'men', 8900, null, 5, null, null, null, '{"src":"/images/products/puma-shuffle-mid.png","box":[19,40,150,132]}'::jsonb, null, null, false, false, array['top_picks']::text[]),
  ('air-jordan-mid', 'air-jordan-mid', 'nike', 'Air Jordan', null, 'Men’s Shoe', 'men', 9900, null, 5, null, null, null, '{"src":"/images/products/air-jordan-1-mid-se-craft.png","box":[8,31,162,136]}'::jsonb, null, null, false, false, array['trending']::text[]),
  ('air-jordan-low-womens', 'air-jordan-low-womens', 'nike', 'Air Jordan', null, 'Women’s Shoe', 'women', 9900, null, 5, null, null, null, '{"src":"/images/products/air-jordan-1-low-se-womens.png","box":[15,31,157,136]}'::jsonb, null, null, false, false, array['trending']::text[]),
  ('puma-classic', 'puma-classic', 'puma', 'Puma Classic', null, 'Men’s Shoe', 'men', 9900, null, 5, null, null, null, '{"src":"/images/products/puma-classic-cat.png","box":[10,69,167,84],"crop":[0,-51.79,100,198.81]}'::jsonb, null, null, false, false, array['trending']::text[]),
  ('new-balance-550', 'new-balance-550', 'new-balance', 'New Balance', null, 'Men’s Shoe', 'men', 9900, null, 5, null, null, null, '{"src":"/images/products/new-balance-550.png","box":[23,60,143,93]}'::jsonb, null, null, false, false, array['trending']::text[]),
  ('nike-run', 'nike-run', 'nike', 'Nike Run', null, 'Men’s Shoe', 'men', 1700, null, 5, null, null, null, '{"src":"/images/products/nike-custom-v2k.png","box":[12,70,164,82],"crop":[-7.32,-85.98,114.02,228.05]}'::jsonb, null, null, false, false, array['trending_customisation']::text[]),
  ('adidas-run', 'adidas-run', 'adidas', 'Adidas Run', null, 'Men’s Shoe', 'men', 1700, null, 5, null, null, null, '{"src":"/images/products/adidas-run-70s.png","box":[17,70,153,82],"crop":[-11.11,-61.59,124.18,231.71]}'::jsonb, null, null, false, false, array['trending_customisation']::text[]),
  ('puma-sneakers', 'puma-sneakers', 'puma', 'Puma Sneakers', null, 'Men’s Shoe', 'men', 1700, null, 5, null, null, null, '{"src":"/images/products/puma-slipstream.png","box":[18,64,147,88],"crop":[-4.08,-42.05,109.52,182.95]}'::jsonb, null, null, false, false, array['trending_customisation']::text[]),
  ('nike-sabrina-2-ep', 'nike-sabrina-2-ep', 'nike', 'Nike Sabrina 2 EP', 'Sabrina 2 EP', 'Basketball Shoes', 'women', 17000, null, 5, 'Sabrina Ionescu''s success is no secret. Her game is based on living in the gym, getting in rep after rep to', 'perfect her craft. Built for that work ethic, this shoe pairs responsive cushioning with a secure, supportive fit and a durable outsole made for quick cuts on outdoor courts.', '[{"label":"Colour shown","value":"University Red / White / Obsidian"},{"label":"Style","value":"Basketball, low top"},{"label":"Upper","value":"Engineered mesh with synthetic overlays"},{"label":"Outsole","value":"Rubber, EP (Extra Protection) for outdoor courts"},{"label":"Country of origin","value":"Vietnam"}]'::jsonb, '{"src":"/images/products/sabrina-2-ep/sabrina-2-red.png","box":[13.5,59,160,79.4],"crop":[-7.75,-111.98,115.5,291.15],"shadow":0.15}'::jsonb, '/images/products/sabrina-2-ep/sabrina-2-red.png', '{"aspect":2.015625,"crop":[-7.75,-111.98,115.5,291.15]}'::jsonb, true, false, '{}'::text[])
on conflict (id) do update set
  slug = excluded.slug,
  brand_id = excluded.brand_id,
  name = excluded.name,
  short_name = excluded.short_name,
  category = excluded.category,
  audience = excluded.audience,
  price = excluded.price,
  discount_label = excluded.discount_label,
  rating = excluded.rating,
  description_excerpt = excluded.description_excerpt,
  description_rest = excluded.description_rest,
  details = excluded.details,
  card_image = excluded.card_image,
  cutout_url = excluded.cutout_url,
  cutout_frame = excluded.cutout_frame,
  has_product_page = excluded.has_product_page,
  is_customizable = excluded.is_customizable,
  home_sections = excluded.home_sections;

-- Product page gallery (4)
insert into public.product_images (id, product_id, src, alt, kind, box, sort_order)
values
  (md5('nike-sabrina-2-ep:image:0')::uuid, 'nike-sabrina-2-ep', '/images/products/sabrina-2-ep/hero.png', 'Nike Sabrina 2 EP in red', 'photo', null, 0),
  (md5('nike-sabrina-2-ep:image:1')::uuid, 'nike-sabrina-2-ep', '/images/products/sabrina-2-ep/sabrina-2-blue.png', 'Nike Sabrina 2 EP in light blue', 'cutout', '[8,23,142,115]'::jsonb, 1),
  (md5('nike-sabrina-2-ep:image:2')::uuid, 'nike-sabrina-2-ep', '/images/products/sabrina-2-ep/sabrina-2-purple.png', 'Nike Sabrina 2 EP in purple', 'cutout', '[15,23,136,122]'::jsonb, 2),
  (md5('nike-sabrina-2-ep:image:3')::uuid, 'nike-sabrina-2-ep', '/images/products/sabrina-2-ep/sabrina-1-olive.png', 'Nike Sabrina 1 in olive', 'cutout', '[13,32,132,106]'::jsonb, 3)
on conflict (product_id, sort_order) do update set
  src = excluded.src,
  alt = excluded.alt,
  kind = excluded.kind,
  box = excluded.box;

-- Sizes (UK) (14)
insert into public.product_sizes (product_id, size_uk, is_default, sort_order)
values
  ('nike-sabrina-2-ep', 4, false, 0),
  ('nike-sabrina-2-ep', 5, false, 1),
  ('nike-sabrina-2-ep', 6, false, 2),
  ('nike-sabrina-2-ep', 7, true, 3),
  ('nike-sabrina-2-ep', 8, false, 4),
  ('nike-sabrina-2-ep', 9, false, 5),
  ('nike-sabrina-2-ep', 10, false, 6),
  ('nike-sabrina-2-ep', 11, false, 7),
  ('nike-air-force', 6, false, 0),
  ('nike-air-force', 7, true, 1),
  ('nike-air-force', 8, false, 2),
  ('nike-air-force', 9, false, 3),
  ('nike-air-force', 10, false, 4),
  ('nike-air-force', 11, false, 5)
on conflict (product_id, size_uk) do update set
  is_default = excluded.is_default,
  sort_order = excluded.sort_order;

-- Reviews (5)
insert into public.product_reviews (id, product_id, author_name, rating, body)
values
  (md5('nike-sabrina-2-ep:review:r1')::uuid, 'nike-sabrina-2-ep', 'Aarav', 5, 'Great grip and very comfortable from day one.'),
  (md5('nike-sabrina-2-ep:review:r2')::uuid, 'nike-sabrina-2-ep', 'Meera', 5, 'Fits true to size. The red looks even better in person.'),
  (md5('nike-sabrina-2-ep:review:r3')::uuid, 'nike-sabrina-2-ep', 'Rohan', 5, 'Light and responsive — perfect for outdoor courts.'),
  (md5('nike-sabrina-2-ep:review:r4')::uuid, 'nike-sabrina-2-ep', 'Diya', 5, 'Customised mine and it came out exactly as designed.'),
  (md5('nike-sabrina-2-ep:review:r5')::uuid, 'nike-sabrina-2-ep', 'Kabir', 5, 'Solid support for quick cuts. Would buy again.')
on conflict (id) do update set
  product_id = excluded.product_id,
  author_name = excluded.author_name,
  rating = excluded.rating,
  body = excluded.body;

-- Customiser (1)
insert into public.customization_configs (product_id, title, display_category, wordmark, image_url, angles)
values
  ('nike-air-force', 'Nike Air Force', 'Custom Men’s Shoes', 'NIKE', '/images/customizer/red-shoe.png', '[{"src":"/images/customizer/red-shoe.png","alt":"Nike Air Force in red, white and black, side view","frame":[12,19.6,371,341],"size":[326.7,182.3],"rotate":-36.57,"shadow":[22.5,45,0.3]}]'::jsonb)
on conflict (product_id) do update set
  title = excluded.title,
  display_category = excluded.display_category,
  wordmark = excluded.wordmark,
  image_url = excluded.image_url,
  angles = excluded.angles;

-- Customiser parts (12)
insert into public.customization_parts (product_id, id, name, sort_order)
values
  ('nike-air-force', 'vamp', 'Vamp', 0),
  ('nike-air-force', 'quarter', 'Quarter', 1),
  ('nike-air-force', 'toe-cap', 'Toe Cap', 2),
  ('nike-air-force', 'eyestay', 'Eyestay', 3),
  ('nike-air-force', 'tongue', 'Tongue', 4),
  ('nike-air-force', 'laces', 'Laces', 5),
  ('nike-air-force', 'heel-counter', 'Heel Counter', 6),
  ('nike-air-force', 'swoosh', 'Swoosh', 7),
  ('nike-air-force', 'collar', 'Collar', 8),
  ('nike-air-force', 'midsole', 'Midsole', 9),
  ('nike-air-force', 'outsole', 'Outsole', 10),
  ('nike-air-force', 'heel-tab', 'Heel Tab', 11)
on conflict (product_id, id) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

-- Customiser colours (6)
insert into public.customization_colours (product_id, id, name, hex, sort_order)
values
  ('nike-air-force', 'black', 'Black', '#000000', 0),
  ('nike-air-force', 'grey', 'Grey', '#808080', 1),
  ('nike-air-force', 'orange', 'Orange', '#FDBA62', 2),
  ('nike-air-force', 'teal', 'Teal', '#599C99', 3),
  ('nike-air-force', 'red', 'Red', '#CD2626', 4),
  ('nike-air-force', 'magenta', 'Magenta', '#E949ED', 5)
on conflict (product_id, id) do update set
  name = excluded.name,
  hex = excluded.hex,
  sort_order = excluded.sort_order;
