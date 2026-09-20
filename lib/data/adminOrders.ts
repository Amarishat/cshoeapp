import { getSupabaseClient } from "@/lib/supabase/client";
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

/** Orders visible to the signed-in account, newest first. */
export async function loadAdminOrders(): Promise<AdminOrder[]> {
  const { data, error } = await getSupabaseClient()
    .from("orders")
    .select("order_number, created_at, status, total, ship_full_name, order_items(count)")
    .order("created_at", { ascending: false })
    .order("order_number", { ascending: false })
    .overrideTypes<AdminOrderRow[], { merge: false }>();
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
  const { data, error } = await getSupabaseClient()
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
