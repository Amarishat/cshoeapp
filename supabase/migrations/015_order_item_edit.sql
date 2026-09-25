-- =============================================================================
-- Cshoe — customers can change the size and quantity of a confirmed order's line
--
-- An order line (public.order_items) is a snapshot taken by place_order():
-- product name, category, image, the unit price paid, size and quantity.
-- Nothing could change it after checkout. This adds one narrow way for the
-- customer to change a line's size and quantity:
--
--   public.update_order_item(order_number, item_id, size_uk, quantity)
--     → (order_number, item_id, size_uk, quantity, subtotal, total)
--
-- Only while the order is still 'confirmed' (not yet shipped), and only the
-- two columns size_uk and quantity. Everything else on the line — unit price,
-- name, category, image, customisation — stays as it was ordered. The order's
-- subtotal and total are then worked out again from its own lines, in the
-- same call:
--
--   subtotal = sum(unit_price × quantity) over the order's lines
--   total    = subtotal − discount + delivery_fee + platform_fee
--
-- using the unit prices and the discount and fees stored on the order, never
-- today's catalogue prices, so orders_total_matches (001) always holds.
--
-- order_items has no foreign key to product_sizes and no upper bound on
-- quantity (unlike cart_items), so this function is what enforces both:
--   * quantity 1–10 (the app's quantity stepper allows the same range);
--   * a whole or half UK size that the product actually offers. A line whose
--     product has since been removed (product_id null) can't be checked, so
--     its size can't change — its quantity still can. Keeping the current
--     size is always allowed, even if the product no longer offers it.
--
-- The same shape as public.cancel_order() (012/013) and
-- public.update_order_address() (014): the caller's own order only, locked
-- for the change, the same error codes —
--   28000  not signed in
--   P0002  order or line not found (including someone else's, so neither can
--          be probed)
--   55000  the order is no longer 'confirmed'
--   22023  an invalid size or quantity
--
-- What is deliberately NOT done here:
--   * No customer update policy or grant on public.orders or
--     public.order_items. Customers change an order only through functions;
--     the admin-only status policy from 009 is unchanged.
--   * No line is added or removed, and no notification is created.
--
-- The orders_sync_cancelled_at trigger (013) runs on the orders update too;
-- the order stays 'confirmed', so it leaves cancelled_at null as it already is.
--
-- Idempotent: the function is created or replaced.
-- =============================================================================

create or replace function public.update_order_item(
  p_order_number text,
  p_item_id      uuid,
  p_size_uk      numeric,
  p_quantity     integer
)
returns table (
  order_number text,
  item_id      uuid,
  size_uk      numeric,
  quantity     integer,
  subtotal     integer,
  total        integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max_quantity constant integer := 10;

  v_user_id      uuid := auth.uid();
  v_order        public.orders%rowtype;
  v_item         public.order_items%rowtype;
  v_size_changed boolean;
  v_subtotal     integer;
begin
  if v_user_id is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  -- The caller's own order only, locked so a concurrent change (a cancel, an
  -- admin status change, another edit) waits for this one.
  select * into v_order
  from public.orders o
  where o.order_number = p_order_number and o.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'Order % can''t be changed: it is already %',
      v_order.order_number, replace(v_order.status::text, '_', ' ')
      using errcode = '55000',
            hint = 'Only a confirmed order that hasn''t shipped yet can be changed.';
  end if;

  -- The line must belong to this order — an id from any other order is not found.
  select * into v_item
  from public.order_items oi
  where oi.id = p_item_id and oi.order_id = v_order.id;

  if not found then
    raise exception 'Order item not found' using errcode = 'P0002';
  end if;

  -- Quantity: 1–10.
  if p_quantity is null or p_quantity < 1 or p_quantity > c_max_quantity then
    raise exception 'Quantity must be between 1 and %', c_max_quantity using errcode = '22023';
  end if;

  -- Size: a whole or half UK size that fits size_uk numeric(3,1).
  if p_size_uk is null or p_size_uk <= 0 or p_size_uk >= 100 or p_size_uk * 2 <> trunc(p_size_uk * 2) then
    raise exception 'Invalid size: % (sizes are whole or half UK sizes)', p_size_uk using errcode = '22023';
  end if;

  v_size_changed := p_size_uk <> v_item.size_uk;

  -- Nothing to change: no writes.
  if not v_size_changed and p_quantity = v_item.quantity then
    return query
    select v_order.order_number, v_item.id, v_item.size_uk, v_item.quantity, v_order.subtotal, v_order.total;
    return;
  end if;

  if v_size_changed then
    if v_item.product_id is null then
      raise exception 'The size of % can''t be changed: the product is no longer available', v_item.product_name
        using errcode = '22023',
              hint = 'The quantity can still be changed.';
    end if;

    if not exists (
      select 1
      from public.product_sizes ps
      where ps.product_id = v_item.product_id and ps.size_uk = p_size_uk
    ) then
      raise exception 'Size UK % isn''t available for %', p_size_uk, v_item.product_name
        using errcode = '22023';
    end if;
  end if;

  -- Only the size and quantity; the price paid and the snapshot stay as ordered.
  update public.order_items oi
  set size_uk  = p_size_uk,
      quantity = p_quantity
  where oi.id = v_item.id;

  -- The order's totals from its own lines, with its stored discount and fees.
  select coalesce(sum(oi.unit_price * oi.quantity), 0)::integer into v_subtotal
  from public.order_items oi
  where oi.order_id = v_order.id;

  update public.orders o
  set subtotal = v_subtotal,
      total    = v_subtotal - o.discount + o.delivery_fee + o.platform_fee
  where o.id = v_order.id;

  return query
  select o.order_number, oi.id, oi.size_uk, oi.quantity, o.subtotal, o.total
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  where o.id = v_order.id and oi.id = v_item.id;
end;
$$;

-- Only signed-in users may change an order's lines; functions are executable
-- by PUBLIC by default, so revoke that first.
revoke all on function public.update_order_item(text, uuid, numeric, integer) from public, anon;
grant execute on function public.update_order_item(text, uuid, numeric, integer) to authenticated;
