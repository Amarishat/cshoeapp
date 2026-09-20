import { listAdminOrders, type AdminOrder } from "@/lib/data/adminOrders";
import { getSupabaseClient } from "@/lib/supabase/client";

/*
 * The admin dashboard's numbers, read from the tables that already exist.
 * Counts are asked for as counts (no rows are transferred), and every count
 * is what the signed-in account may see: the catalogue is public, while
 * orders are limited by row level security.
 */

export interface AdminDashboard {
  productCount: number;
  brandCount: number;
  orderCount: number;
  customizerCount: number;
  recentOrders: AdminOrder[];
}

export class AdminDashboardError extends Error {
  constructor(what: string, cause: { message: string }) {
    super(`Could not load ${what}: ${cause.message}`, { cause });
    this.name = "AdminDashboardError";
  }
}

/** The tables the dashboard counts. */
type CountableTable = "products" | "brands" | "orders" | "customization_configs";

async function countOf(table: CountableTable): Promise<number> {
  const { count, error } = await getSupabaseClient()
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new AdminDashboardError(`the ${table.replace("_", " ")} count`, error);
  return count ?? 0;
}

/** How many recent orders the dashboard lists. */
const RECENT_ORDERS = 5;

/** Everything the dashboard shows, in one go. */
export async function loadAdminDashboard(): Promise<AdminDashboard> {
  const [productCount, brandCount, orderCount, customizerCount, recentOrders] = await Promise.all([
    countOf("products"),
    countOf("brands"),
    countOf("orders"),
    countOf("customization_configs"),
    listAdminOrders(RECENT_ORDERS),
  ]);

  return { productCount, brandCount, orderCount, customizerCount, recentOrders };
}
