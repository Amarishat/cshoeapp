import type { OrderStatus } from "@/lib/types";

/*
 * Sales figures for the admin dashboard, worked out from real order rows.
 * Pure functions only: no fetching, and "now" is always passed in, so the
 * same rows always give the same numbers. Money is whole rupees, as stored.
 *
 * Revenue is the order total (items plus delivery and platform fees).
 * Cancelled orders are real orders, so they count towards the order total and
 * the status breakdown, but they sold nothing: revenue, average order value,
 * units, the 30-day timeline and top products leave them out.
 */

/** One order line, as the dashboard reads it. */
export interface StatsOrderItem {
  quantity: number;
  unitPrice: number;
  productName: string;
  productCategory: string;
  isCustomized: boolean;
}

/** One order, as the dashboard reads it. */
export interface StatsOrder {
  createdAt: string;
  status: OrderStatus;
  total: number;
  items: StatsOrderItem[];
}

export interface DailySales {
  /** Local calendar day, "YYYY-MM-DD". */
  date: string;
  revenue: number;
  orders: number;
}

export interface StatusCount {
  status: OrderStatus;
  count: number;
}

export interface TopProduct {
  /** The name snapshot on the order line (still counted if the product was removed). */
  name: string;
  category: string;
  units: number;
  revenue: number;
}

export interface OrderStats {
  /** Excludes cancelled orders. */
  totalRevenue: number;
  /** Every order, cancelled ones included. */
  totalOrders: number;
  /** How many of totalOrders are cancelled. */
  cancelledOrders: number;
  /** Revenue per order that wasn't cancelled, rounded to whole rupees; 0 when there are none. */
  averageOrderValue: number;
  /** Excludes cancelled orders. */
  unitsSold: number;
  /** Oldest day first, one entry per day — days without orders are zeros. Excludes cancelled orders. */
  last30Days: DailySales[];
  /** Every status, in fulfilment order then "cancelled", including those with no orders. */
  statusBreakdown: StatusCount[];
  /** Up to 5, most units first. Excludes cancelled orders. */
  topProducts: TopProduct[];
  /** Units on customised vs standard lines. Excludes cancelled orders. */
  customizedUnits: number;
  standardUnits: number;
}

/** Statuses in fulfilment order, then "cancelled" (which ends an order off that path). */
export const ORDER_STATUSES: readonly OrderStatus[] = [
  "confirmed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

/** The orders that count as sales: every order except cancelled ones. */
export function salesOrders(orders: readonly StatsOrder[]): StatsOrder[] {
  return orders.filter((order) => order.status !== "cancelled");
}

/** How many days the sales timeline covers, today included. */
export const TIMELINE_DAYS = 30;

/** How many products the top-products list keeps. */
export const TOP_PRODUCTS = 5;

/** "YYYY-MM-DD" for the local calendar day of `date`. */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Revenue and order count per local day for the `days` days ending today
 * (oldest first). Days without orders are included as zeros, so the timeline
 * is continuous; orders outside the window are ignored.
 */
export function dailySales(orders: readonly StatsOrder[], now: Date, days = TIMELINE_DAYS): DailySales[] {
  const timeline: DailySales[] = [];
  const byDay = new Map<string, DailySales>();
  for (let offset = days - 1; offset >= 0; offset--) {
    // Stepping by calendar day (not by 24h) keeps the keys right across DST changes.
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const entry = { date: localDayKey(day), revenue: 0, orders: 0 };
    timeline.push(entry);
    byDay.set(entry.date, entry);
  }

  for (const order of orders) {
    const entry = byDay.get(localDayKey(new Date(order.createdAt)));
    if (!entry) continue;
    entry.revenue += order.total;
    entry.orders += 1;
  }
  return timeline;
}

/** How many orders are in each status, every status included. */
export function statusBreakdown(orders: readonly StatsOrder[]): StatusCount[] {
  const counts = new Map<OrderStatus, number>(ORDER_STATUSES.map((status) => [status, 0]));
  for (const order of orders) counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  return ORDER_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 }));
}

/**
 * The best-selling products by units, grouped by the line's product name.
 * Ties go to the higher revenue, then by name, so the order is stable.
 */
export function topProducts(orders: readonly StatsOrder[], limit = TOP_PRODUCTS): TopProduct[] {
  const byName = new Map<string, TopProduct>();
  for (const order of orders) {
    for (const item of order.items) {
      let product = byName.get(item.productName);
      if (!product) {
        product = { name: item.productName, category: item.productCategory, units: 0, revenue: 0 };
        byName.set(item.productName, product);
      }
      product.units += item.quantity;
      product.revenue += item.quantity * item.unitPrice;
    }
  }
  return [...byName.values()]
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/**
 * Every dashboard figure from the given orders; `now` sets the 30-day window.
 * Sales figures come from the orders that weren't cancelled; the order count
 * and status breakdown use them all.
 */
export function computeOrderStats(orders: readonly StatsOrder[], now: Date): OrderStats {
  const sales = salesOrders(orders);
  let totalRevenue = 0;
  let customizedUnits = 0;
  let standardUnits = 0;
  for (const order of sales) {
    totalRevenue += order.total;
    for (const item of order.items) {
      if (item.isCustomized) customizedUnits += item.quantity;
      else standardUnits += item.quantity;
    }
  }

  return {
    totalRevenue,
    totalOrders: orders.length,
    cancelledOrders: orders.length - sales.length,
    averageOrderValue: sales.length === 0 ? 0 : Math.round(totalRevenue / sales.length),
    unitsSold: customizedUnits + standardUnits,
    last30Days: dailySales(sales, now),
    statusBreakdown: statusBreakdown(orders),
    topProducts: topProducts(sales),
    customizedUnits,
    standardUnits,
  };
}
