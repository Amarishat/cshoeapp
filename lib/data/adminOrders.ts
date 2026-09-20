import { getSupabaseClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/lib/types";

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
