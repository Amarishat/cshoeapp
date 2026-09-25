import { getAdminSupabaseClient } from "@/lib/supabase/client";
import type { AddressType, OrderStatus } from "@/lib/types";

/*
 * Orders for the admin list, read from public.orders.
 *
 * Only non-sensitive fields are selected: the order number, when it was
 * placed, its status, the total, the delivery name and how many lines it has.
 * The customer's account id, phone number and address are deliberately left
 * out — an order list doesn't need them.
 *
 * Row level security still applies: public.orders only exposes rows to their
 * owner ("Read own orders"), so this returns what the signed-in account is
 * allowed to see.
 */

export interface AdminOrder {
  /** The human order number, e.g. "OD10000000024". */
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  /** Whole rupees. */
  total: number;
  /** Delivery name from the order's own snapshot. */
  shipName: string;
  itemCount: number;
}

interface CountRow {
  count: number;
}

interface AdminOrderRow {
  order_number: string;
  created_at: string;
  status: OrderStatus;
  total: number;
  ship_full_name: string;
  order_items: CountRow[];
}

export class AdminOrderError extends Error {
  constructor(action: string, cause: { message: string }) {
    super(`Could not ${action}: ${cause.message}`, { cause });
    this.name = "AdminOrderError";
  }
}

/** Orders visible to the signed-in account, newest first; `limit` caps the rows. */
export async function listAdminOrders(limit?: number): Promise<AdminOrder[]> {
  let query = getAdminSupabaseClient()
    .from("orders")
    .select("order_number, created_at, status, total, ship_full_name, order_items(count)")
    .order("created_at", { ascending: false })
    .order("order_number", { ascending: false });
  if (limit !== undefined) query = query.limit(limit);

  const { data, error } = await query.overrideTypes<AdminOrderRow[], { merge: false }>();
  if (error) throw new AdminOrderError("load the orders", error);

  return data.map((row) => ({
    orderNumber: row.order_number,
    createdAt: row.created_at,
    status: row.status,
    total: row.total,
    shipName: row.ship_full_name,
    itemCount: row.order_items[0]?.count ?? 0,
  }));
}

/** Every visible order — what the Orders screen lists. */
export function loadAdminOrders(): Promise<AdminOrder[]> {
  return listAdminOrders();
}

// ---------------------------------------------------------------------------
// One order, in full
// ---------------------------------------------------------------------------

export interface AdminOrderCustomisation {
  partName: string;
  colourName: string;
  colourHex: string;
}

export interface AdminOrderLine {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  /** UK size, e.g. 7. */
  sizeUK: number;
  quantity: number;
  unitPrice: number;
  /** unit_price × quantity, worked out here — the table stores the unit price. */
  lineTotal: number;
  isCustomized: boolean;
  customisations: AdminOrderCustomisation[];
}

/**
 * One order for the admin. The shipping snapshot is what fulfilment needs;
 * the customer's account id and the address row id are not read.
 */
export interface AdminOrderDetail {
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  shipName: string;
  shipPhone: string;
  shipStreet: string;
  shipArea: string;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  shipType: AddressType;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  platformFee: number;
  total: number;
  lines: AdminOrderLine[];
}

interface AdminOrderDetailRow {
  order_number: string;
  created_at: string;
  status: OrderStatus;
  ship_full_name: string;
  ship_phone: string;
  ship_street: string;
  ship_area: string;
  ship_city: string;
  ship_state: string;
  ship_pincode: string;
  ship_type: AddressType;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  platform_fee: number;
  total: number;
  order_items: {
    id: string;
    product_name: string;
    product_category: string;
    image_url: string;
    size_uk: number;
    quantity: number;
    unit_price: number;
    is_customized: boolean;
    order_item_customizations: {
      part_id: string;
      part_name: string;
      colour_name: string;
      colour_hex: string;
    }[];
  }[];
}

const ADMIN_ORDER_COLUMNS =
  "order_number, created_at, status, ship_full_name, ship_phone, ship_street, ship_area, " +
  "ship_city, ship_state, ship_pincode, ship_type, subtotal, discount, delivery_fee, " +
  "platform_fee, total, " +
  "order_items(id, product_name, product_category, image_url, size_uk, quantity, unit_price, " +
  "is_customized, order_item_customizations(part_id, part_name, colour_name, colour_hex))";

/** One order by its order number; null if this account can't see it (or it doesn't exist). */
export async function getAdminOrder(orderNumber: string): Promise<AdminOrderDetail | null> {
  const { data, error } = await getAdminSupabaseClient()
    .from("orders")
    .select(ADMIN_ORDER_COLUMNS)
    .eq("order_number", orderNumber)
    .maybeSingle()
    .overrideTypes<AdminOrderDetailRow | null, { merge: false }>();
  if (error) throw new AdminOrderError(`load order ${orderNumber}`, error);
  if (!data) return null;

  return {
    orderNumber: data.order_number,
    createdAt: data.created_at,
    status: data.status,
    shipName: data.ship_full_name,
    shipPhone: data.ship_phone,
    shipStreet: data.ship_street,
    shipArea: data.ship_area,
    shipCity: data.ship_city,
    shipState: data.ship_state,
    shipPincode: data.ship_pincode,
    shipType: data.ship_type,
    subtotal: data.subtotal,
    discount: data.discount,
    deliveryFee: data.delivery_fee,
    platformFee: data.platform_fee,
    total: data.total,
    lines: data.order_items.map((item) => ({
      id: item.id,
      name: item.product_name,
      category: item.product_category,
      imageUrl: item.image_url,
      sizeUK: Number(item.size_uk),
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.unit_price * item.quantity,
      isCustomized: item.is_customized,
      customisations: item.order_item_customizations.map((c) => ({
        partName: c.part_name,
        colourName: c.colour_name,
        colourHex: c.colour_hex,
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// The one admin write: an order's status
// ---------------------------------------------------------------------------

/**
 * The status changes public.admin_set_order_status() (016) allows, from each
 * status: forward along fulfilment, or cancelling before shipping. Delivered
 * and cancelled are final. Mirrors the database so the screen only offers
 * moves it will accept; the database still decides.
 */
export const ADMIN_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  confirmed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** A refused or failed status change, with the database's error code when there is one. */
export class AdminOrderStatusError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "AdminOrderStatusError";
    this.code = code;
  }
}

/** What admin_set_order_status() returns: one row with the order's new state. */
interface StatusRow {
  order_number: string;
  status: OrderStatus;
  cancelled_at: string | null;
}

/**
 * Moves an order from `expectedStatus` (the status the admin was looking at)
 * to `newStatus` through public.admin_set_order_status(). The database locks
 * the order, refuses if its status has changed since it was loaded, allows
 * only the moves in ADMIN_STATUS_TRANSITIONS, and admits admins only. Nothing
 * here writes to public.orders directly. Returns the stored status and
 * cancellation time; throws AdminOrderStatusError if refused.
 */
export async function updateAdminOrderStatus(
  orderNumber: string,
  expectedStatus: OrderStatus,
  newStatus: OrderStatus,
): Promise<{ status: OrderStatus; cancelledAt: string | null }> {
  const { data, error } = await getAdminSupabaseClient().rpc("admin_set_order_status", {
    p_order_number: orderNumber,
    p_expected_status: expectedStatus,
    p_new_status: newStatus,
  });
  if (error) {
    const message =
      error.code === "55000"
        ? "This order changed since you loaded it. Reload and try again."
        : error.code === "P0002"
          ? "Order not found."
          : error.code === "42501"
            ? "Only an admin can change an order’s status."
            : // 22023 (no change, or a move that isn't allowed) is already written for people; anything else as it came.
              error.message;
    throw new AdminOrderStatusError(message, error.code);
  }
  // A set-returning function comes back as an array of rows.
  const row = ((data ?? []) as StatusRow[])[0];
  if (row?.order_number !== orderNumber) {
    throw new AdminOrderStatusError(`The status of order ${orderNumber} wasn’t updated.`);
  }
  return { status: row.status, cancelledAt: row.cancelled_at };
}
