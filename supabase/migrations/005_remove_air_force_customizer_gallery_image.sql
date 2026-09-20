-- =============================================================================
-- Cshoe — remove the Customizer image from the Nike Air Force gallery
--
-- 004 added two gallery images for nike-air-force. The second one
-- (sort_order 1) is /images/customizer/red-shoe.png — the Customizer's own
-- asset, which belongs to the customiser (customization_configs.image_url and
-- its angles), not to the normal product page. The product's gallery keeps
-- only its own image (sort_order 0, the white pair).
--
-- Nothing else changes: the product row (including cutout_url and
-- has_product_page), its sizes, and the customiser config are untouched.
--
-- Idempotent: the row is gone after the first run, and running this again
-- deletes nothing.
-- =============================================================================

delete from public.product_images
where product_id = 'nike-air-force'
  and sort_order = 1;
