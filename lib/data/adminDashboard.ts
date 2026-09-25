import { computeOrderStats, type OrderStats, type StatsOrder } from "@/lib/adminDashboardStats";
import { listAdminOrders, type AdminOrder } from "@/lib/data/adminOrders";
import { getAdminSupabaseClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/lib/types";

/*
 * The admin dashboard's numbers, read from the tables that already exist.
 * Counts are asked for as counts (no rows are transferred), and every count
 * is what the signed-in account may see: the catalogue is public, while
 * orders are limited by row level security (admins may read every order).
 * The sales figures are worked out from the real order rows
 * (lib/adminDashboardStats.ts); nothing is estimated or filled in.
 */

export interface AdminDashboard {
  productCount: number;
  brandCount: number;
  orderCount: number;
  customizerCount: number;
  recentOrders: AdminOrder[];
  /** Revenue, averages, the 30-day timeline and breakdowns. */
  stats: OrderStats;
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
  const { count, error } = await getAdminSupabaseClient()
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new AdminDashboardError(`the ${table.replace("_", " ")} count`, error);
  return count ?? 0;
}

/** How many recent orders the dashboard lists. */
const RECENT_ORDERS = 5;

interface StatsOrderRow {
  created_at: string;
  status: OrderStatus;
  total: number;
  order_items: {
    quantity: number;
    unit_price: number;
    product_name: string;
    product_category: string;
    is_customized: boolean;
  }[];
}

/**
 * Rows per request. PostgREST returns at most 1000 rows by default, so the
 * orders are read a page at a time until a short page shows the end.
 */
const PAGE_SIZE = 1000;

/** Every visible order with its lines — only the fields the figures need. */
async function listStatsOrders(): Promise<StatsOrder[]> {
  const orders: StatsOrder[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await getAdminSupabaseClient()
      .from("orders")
      .select("created_at, status, total, order_items(quantity, unit_price, product_name, product_category, is_customized)")
      // A fixed order keeps the pages from overlapping or skipping rows.
      .order("created_at", { ascending: true })
      .order("order_number", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
      .overrideTypes<StatsOrderRow[], { merge: false }>();
    if (error) throw new AdminDashboardError("the sales figures", error);

    for (const row of data) {
      orders.push({
        createdAt: row.created_at,
        status: row.status,
        total: row.total,
        items: row.order_items.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unit_price,
          productName: item.product_name,
          productCategory: item.product_category,
          isCustomized: item.is_customized,
        })),
      });
    }
    if (data.length < PAGE_SIZE) return orders;
  }
}

/** Everything the dashboard shows, in one go. */
export async function loadAdminDashboard(): Promise<AdminDashboard> {
  const [productCount, brandCount, orderCount, customizerCount, recentOrders, statsOrders] = await Promise.all([
    countOf("products"),
    countOf("brands"),
    countOf("orders"),
    countOf("customization_configs"),
    listAdminOrders(RECENT_ORDERS),
    listStatsOrders(),
  ]);

  return {
    productCount,
    brandCount,
    orderCount,
    customizerCount,
    recentOrders,
    stats: computeOrderStats(statsOrders, new Date()),
  };
}
