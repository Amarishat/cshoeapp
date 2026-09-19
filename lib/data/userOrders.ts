import { getSupabaseClient } from "@/lib/supabase/client";
import { ensureGuestSession } from "@/lib/supabase/guestSession";
import type { AddressType, CustomizationSelection, Order, OrderStatus, UpiAppId } from "@/lib/types";

/*
 * The current (anonymous guest) user's orders in Supabase. Orders are created
 * only by the database function public.place_order(), which prices the
 * selected Bag rows, creates the order, its items, their customisation
 * snapshots and the "Order confirmed" notification, and deletes the ordered
 * Bag rows — all in one transaction. Nothing is written from here directly.
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
    order_item_customizations: { part_id: string; colour_id: string }[];
  }[];
}

const ORDER_COLUMNS =
  "id, order_number, created_at, status, address_id, ship_full_name, ship_phone, ship_pincode, " +
  "ship_state, ship_city, ship_area, ship_street, ship_type, payment_method, upi_app, " +
  "subtotal, discount, delivery_fee, platform_fee, total, " +
  "order_items(id, product_id, product_name, product_category, image_url, image_fit, size_uk, " +
  "quantity, unit_price, is_customized, order_item_customizations(part_id, colour_id))";

/** A database order in the app's existing Order shape (its id is the order number). */
function toOrder(row: OrderRow): Order {
  if (row.payment_method !== "upi" || !row.upi_app) {
    throw new OrderError(`show order ${row.order_number}`, { message: "unsupported payment method" });
  }
  return {
    id: row.order_number,
    createdAt: row.created_at,
    status: row.status,
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
        ...(item.is_customized ? { customization } : {}),
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

/** One of the guest's orders by its order number; null if there is no such order. */
export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  await ensureGuestSession();
  const { data, error } = await getSupabaseClient()
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("order_number", orderNumber)
    .maybeSingle()
    .overrideTypes<OrderRow | null, { merge: false }>();
  if (error) throw new OrderError(`load order ${orderNumber}`, error);
  return data ? toOrder(data) : null;
}
