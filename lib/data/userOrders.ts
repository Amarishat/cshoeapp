import { getSupabaseClient } from "@/lib/supabase/client";
import { ensureGuestSession } from "@/lib/supabase/guestSession";
import type { AddressType, CustomizationSelection, Order, OrderStatus, UpiAppId } from "@/lib/types";

/*
 * The current (anonymous guest) user's orders in Supabase. Orders are created
 * only by the database function public.place_order(), which prices the
 * selected Bag rows, creates the order, its items, their customisation
 * snapshots and the "Order confirmed" notification, and deletes the ordered
 * Bag rows — all in one transaction. The only other write is cancelling, also
 * through a database function (public.cancel_order()). Nothing is written to
 * the order tables from here directly.
 */

export class OrderError extends Error {
  code?: string;
  constructor(action: string, cause: { message: string; code?: string }) {
    super(`Could not ${action}: ${cause.message}`, { cause });
    this.name = "OrderError";
    this.code = cause.code;
  }
}

/**
 * Places the order for the guest's selected Bag items, delivered to
 * `addressId`, paid with `upiApp` (the payment itself is simulated). Returns
 * the database's order number (e.g. "OD10000000001"). Throws if the database
 * refused or the request failed; in that case nothing was ordered.
 */
export async function placeOrder(addressId: string, upiApp: UpiAppId): Promise<string> {
  await ensureGuestSession();
  const { data, error } = await getSupabaseClient().rpc("place_order", {
    p_address_id: addressId,
    p_upi_app: upiApp,
  });
  if (error) throw new OrderError("place your order", error);
  if (typeof data !== "string" || !data) {
    throw new OrderError("place your order", { message: "no order number was returned" });
  }
  return data;
}

interface OrderRow {
  id: string;
  order_number: string;
  created_at: string;
  status: OrderStatus;
  cancelled_at: string | null;
  address_id: string | null;
  ship_full_name: string;
  ship_phone: string;
  ship_pincode: string;
  ship_state: string;
  ship_city: string;
  ship_area: string;
  ship_street: string;
  ship_type: AddressType;
  payment_method: string;
  upi_app: UpiAppId | null;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  platform_fee: number;
  total: number;
  order_items: {
    id: string;
    product_id: string | null;
    product_name: string;
    product_category: string;
    image_url: string;
    image_fit: "cover" | "contain";
    size_uk: number;
    quantity: number;
    unit_price: number;
    is_customized: boolean;
    order_item_customizations: { part_id: string; part_name: string; colour_id: string; colour_name: string }[];
  }[];
}

const ORDER_COLUMNS =
  "id, order_number, created_at, status, cancelled_at, address_id, ship_full_name, ship_phone, ship_pincode, " +
  "ship_state, ship_city, ship_area, ship_street, ship_type, payment_method, upi_app, " +
  "subtotal, discount, delivery_fee, platform_fee, total, " +
  "order_items(id, product_id, product_name, product_category, image_url, image_fit, size_uk, " +
  "quantity, unit_price, is_customized, order_item_customizations(part_id, part_name, colour_id, colour_name))";

/** A database order in the app's existing Order shape (its id is the order number). */
function toOrder(row: OrderRow): Order {
  if (row.payment_method !== "upi" || !row.upi_app) {
    throw new OrderError(`show order ${row.order_number}`, { message: "unsupported payment method" });
  }
  return {
    id: row.order_number,
    createdAt: row.created_at,
    status: row.status,
    cancelledAt: row.cancelled_at,
    lines: row.order_items.map((item) => {
      const customization: CustomizationSelection = Object.fromEntries(
        item.order_item_customizations.map((c) => [c.part_id, c.colour_id]),
      );
      return {
        // Order lines have no Bag item any more; the row id keeps them unique.
        bagItemId: item.id,
        productId: item.product_id ?? "",
        name: item.product_name,
        category: item.product_category,
        image: { src: item.image_url, fit: item.image_fit },
        size: `UK ${Number(item.size_uk)}`,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        ...(item.is_customized
          ? {
              customization,
              customizationChoices: item.order_item_customizations.map((c) => ({
                partId: c.part_id,
                partName: c.part_name,
                colourId: c.colour_id,
                colourName: c.colour_name,
              })),
            }
          : {}),
      };
    }),
    address: {
      id: row.address_id ?? "",
      fullName: row.ship_full_name,
      phone: row.ship_phone,
      pincode: row.ship_pincode,
      state: row.ship_state,
      city: row.ship_city,
      area: row.ship_area,
      street: row.ship_street,
      type: row.ship_type,
      isDefault: false,
    },
    payment: { method: "upi", app: row.upi_app },
    totals: {
      subtotal: row.subtotal,
      discount: row.discount,
      delivery: row.delivery_fee,
      platformFee: row.platform_fee,
      total: row.total,
    },
  };
}

/**
 * One of the guest's orders by its order number; null if there is no such
 * order. Filtered by the guest's user id as well as RLS, since admins may read
 * every order (008) and this must only ever return the guest's own.
 */
export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const userId = (await ensureGuestSession()).user.id;
  const { data, error } = await getSupabaseClient()
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("user_id", userId)
    .eq("order_number", orderNumber)
    .maybeSingle()
    .overrideTypes<OrderRow | null, { merge: false }>();
  if (error) throw new OrderError(`load order ${orderNumber}`, error);
  return data ? toOrder(data) : null;
}

/**
 * The guest's orders, newest first (by created_at). Every database order has
 * at least one item (place_order() refuses an empty Bag); an order without
 * items could not be shown as an order card, so it is left out.
 */
export async function listOrders(): Promise<Order[]> {
  const userId = (await ensureGuestSession()).user.id;
  const { data, error } = await getSupabaseClient()
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("order_number", { ascending: false })
    .overrideTypes<OrderRow[], { merge: false }>();
  if (error) throw new OrderError("load your orders", error);
  return data.filter((row) => row.order_items.length > 0).map(toOrder);
}

/** What public.update_order_address() returns: one row with the order's new shipping snapshot. */
interface UpdatedAddressRow {
  order_number: string;
}

/**
 * Changes where one of the guest's orders is delivered, through the database
 * function public.update_order_address(): it copies `addressId` (one of the
 * guest's saved addresses) into the order's shipping snapshot, and only while
 * the order is still "confirmed" (not yet shipped). Nothing else on the order
 * changes. Throws if the database refused or the request failed; in that case
 * nothing changed.
 */
export async function updateOrderAddress(orderNumber: string, addressId: string): Promise<void> {
  await ensureGuestSession();
  const { data, error } = await getSupabaseClient().rpc("update_order_address", {
    p_order_number: orderNumber,
    p_address_id: addressId,
  });
  if (error) {
    // The function's own refusals, in plain words; anything else as it came.
    const message =
      error.code === "55000"
        ? "it has already shipped. Only an order that hasn’t shipped yet can be changed"
        : error.code === "P0002"
          ? error.message === "Address not found"
            ? "that address wasn’t found. Choose another saved address"
            : "this order wasn’t found"
          : error.message;
    throw new OrderError("change the delivery address", { message, code: error.code });
  }
  // A set-returning function comes back as an array of rows.
  const rows = (data ?? []) as UpdatedAddressRow[];
  if (rows[0]?.order_number !== orderNumber) {
    throw new OrderError("change the delivery address", { message: "the order wasn’t updated" });
  }
}

/** What public.cancel_order() returns: one row with the order's new state. */
interface CancelledOrderRow {
  order_number: string;
  status: OrderStatus;
}

/**
 * Cancels one of the guest's orders through the database function
 * public.cancel_order(), which only allows it while the order is still
 * "confirmed" (not yet shipped), and creates the "Order cancelled"
 * notification. Throws if the database refused or the request failed; in
 * that case nothing changed.
 */
export async function cancelOrder(orderNumber: string): Promise<void> {
  await ensureGuestSession();
  const { data, error } = await getSupabaseClient().rpc("cancel_order", { p_order_number: orderNumber });
  if (error) {
    // The function's own refusals, in plain words; anything else as it came.
    const message =
      error.code === "55000"
        ? "it has already shipped. Only an order that hasn’t shipped yet can be cancelled"
        : error.code === "P0002"
          ? "this order wasn’t found"
          : error.message;
    throw new OrderError("cancel this order", { message, code: error.code });
  }
  // A set-returning function comes back as an array of rows.
  const rows = (data ?? []) as CancelledOrderRow[];
  if (rows[0]?.status !== "cancelled") {
    throw new OrderError("cancel this order", { message: "the order wasn’t cancelled" });
  }
}
