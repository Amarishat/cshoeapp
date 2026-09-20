-- =============================================================================
-- Cshoe — product page for Nike Air Force
--
-- Fills in the product-page fields the shared product screen needs, and turns
-- the page on (has_product_page). Nothing else about the product changes: the
-- price (₹9,999), brand, name, category, audience, card image, discount label,
-- its six sizes and its customiser (is_customizable, customization_configs)
-- are all left as they are.
--
-- Images are the two Nike Air Force assets already in the project — the white
-- pair used on its card, and the red pair used by the Customizer. Nothing is
-- generated, and no reviews are invented (the Reviews section shows 0).
--
-- Idempotent: re-running updates the same rows and never creates duplicates.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Product-page fields
-- ---------------------------------------------------------------------------
-- short_name      header title, as "Sabrina 2 EP" is for the other page
-- description_*   excerpt + the rest revealed by "see more"
-- details         Product Information rows; every value is taken from this
--                 product's own data (its asset, its sizes, its customiser)
-- cutout_url      transparent cut-out for Bag and order lines (its card image)
-- cutout_frame    the card image's aspect (157 × 152 box), so the Wishlist row
--                 keeps the proportions it has today
update public.products set
  short_name          = 'Air Force',
  description_excerpt = 'The Air Force is the pair you can design yourself: choose a colour for any of its twelve parts — vamp, quarter, toe cap, eyestay, tongue, laces, heel counter, swoosh, collar, midsole, outsole and heel tab — then',
  description_rest    = 'save the design to your bag. Prefer it as it comes? Add this pair straight to the bag in any size from UK 6 to 11.',
  details             = '[
                          {"label":"Colour shown","value":"White"},
                          {"label":"Style","value":"Mid top"},
                          {"label":"Customisation","value":"12 parts, 6 colours"},
                          {"label":"Sizes","value":"UK 6–11"}
                        ]'::jsonb,
  cutout_url          = '/images/products/nike-air-force-1-mid.png',
  cutout_frame        = '{"aspect":1.0328947368421053}'::jsonb,
  has_product_page    = true
where id = 'nike-air-force';

-- ---------------------------------------------------------------------------
-- Gallery (2)
-- ---------------------------------------------------------------------------
-- Both are existing assets. `box` places each one inside the 158 × 163 tile
-- the gallery measures in, at the asset's own aspect ratio, so neither is
-- stretched or cropped: 499 × 499 fills the tile's width; 1485 × 835 is
-- letterboxed (158 × 89, centred).
insert into public.product_images (id, product_id, src, alt, kind, box, sort_order)
values
  (md5('nike-air-force:image:0')::uuid, 'nike-air-force', '/images/products/nike-air-force-1-mid.png', 'Nike Air Force in white, side view', 'cutout', '[0,3,158,158]'::jsonb, 0),
  (md5('nike-air-force:image:1')::uuid, 'nike-air-force', '/images/customizer/red-shoe.png', 'Nike Air Force in red, white and black, side view', 'cutout', '[0,37,158,89]'::jsonb, 1)
on conflict (product_id, sort_order) do update set
  src  = excluded.src,
  alt  = excluded.alt,
  kind = excluded.kind,
  box  = excluded.box;
