-- =============================================================================
-- Cshoe — at most 10 of one item, in the Bag and in new orders
--
-- The app's quantity steppers stop at 10, and editing a placed order already
-- allows 1–10 (update_order_item(), 015/018). The Bag had no upper limit in
-- the database, though: adding the same plain item again added to its row
-- without bound, and place_order() copies Bag quantities straight into the
-- order. This makes 10 a database rule for both:
--
--   * public.cart_items.quantity <= 10 (cart_items_quantity_max). Bag rows
--     already above 10 are brought down to 10 first, so the rule holds for
--     every row.
--   * public.order_items.quantity <= 10 for new and changed rows
--     (order_items_quantity_max, NOT VALID). Orders already placed with more
--     are left exactly as they were; only new order lines — which
--     place_order() takes from the now-limited Bag — are held to it, so
--     checkout can never create a line above 10.
--
-- A violation is Postgres error 23514 (check_violation), which the app shows
-- as "you can have at most 10 of one item in your bag". The existing
-- quantity >= 1 checks from 001 are unchanged.
--
-- No function, policy or grant changes.
--
-- Idempotent: the clean-up only touches rows still above 10, and each
-- constraint is dropped if present before being added.
-- =============================================================================

-- Bag rows above the limit (possible until now) are brought down to it.
update public.cart_items
set quantity = 10
where quantity > 10;

alter table public.cart_items drop constraint if exists cart_items_quantity_max;
alter table public.cart_items
  add constraint cart_items_quantity_max check (quantity <= 10);

-- New order lines only: NOT VALID skips checking existing rows, so past
-- orders keep their quantities.
alter table public.order_items drop constraint if exists order_items_quantity_max;
alter table public.order_items
  add constraint order_items_quantity_max check (quantity <= 10) not valid;
