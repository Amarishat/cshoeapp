import { computeBagTotals, isSelected } from "@/lib/pricing";
import type { Address, BagProduct, CartItem, Order, OrderStatus, UpiAppId } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Friday, 9 May" — Figma tracker date style (3-letter month so it fits at 360px, e.g. "18 Sep"). */
export function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  return `${weekday}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export interface ProgressStep {
  label: string;
  done: boolean;
  date?: string;
}

export const statusRank: Record<OrderStatus, number> = {
  confirmed: 0,
  shipped: 1,
  out_for_delivery: 2,
  delivered: 3,
};

/**
 * Tracker steps for an order, derived from its status. V1 orders are always
 * "confirmed"; shipped/delivered dates will come from real tracking later.
 */
export function orderProgress(order: Order): ProgressStep[] {
  const rank = statusRank[order.status];
  return [
    { label: "Order Confirmed", done: true, date: formatOrderDate(order.createdAt) },
    { label: "Shipped", done: rank >= statusRank.shipped },
    { label: "Delivered", done: rank >= statusRank.delivered },
  ];
}

/** "Sep 19" — Order Details tracker date style (Figma "May 9"). */
export function formatShortOrderDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Status-specific content for Order Details. V1 only has "confirmed"; the
 * completed (delivered) variant from Figma 1:3715 can be added here later.
 */
export function orderStatusView(order: Order) {
  switch (order.status) {
    case "confirmed":
    case "shipped":
    case "out_for_delivery":
    case "delivered":
      return { sectionTitle: "In Progress Orders", label: "In Progress", showArrival: true };
  }
}

/** Vertical tracker steps for Order Details (Figma 1:3892). */
export function orderDetailProgress(order: Order, expectedDelivery: string): ProgressStep[] {
  const rank = statusRank[order.status];
  const steps: ProgressStep[] = [
    { label: `Order Confirmed, ${formatShortOrderDate(order.createdAt)}`, done: true },
  ];
  if (rank >= statusRank.shipped) steps.push({ label: "Shipped", done: true });
  steps.push({ label: `Expected Delivery, ${expectedDelivery}`, done: rank >= statusRank.delivered });
  return steps;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** "Fri, 9th May ‘24" — Track Order date style (Figma 1:4176). */
export function formatTrackDate(iso: string): string {
  const d = new Date(iso);
  const year = String(d.getFullYear()).slice(-2);
  return `${WEEKDAYS[d.getDay()]}, ${ordinal(d.getDate())} ${MONTHS[d.getMonth()]} ‘${year}`;
}

/** "Fri, 9th May ‘24 - 5:55pm" — Track Order event timestamp. */
export function formatTrackTimestamp(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const time = `${hours % 12 || 12}:${minutes}${hours < 12 ? "am" : "pm"}`;
  return `${formatTrackDate(iso)} - ${time}`;
}

export interface TrackEvent {
  message: string;
  time: string;
}

export interface TrackStep {
  key: "confirmed" | "shipped" | "out_for_delivery" | "delivery";
  title: string;
  date?: string;
  events: TrackEvent[];
  done: boolean;
}

/**
 * Track Order timeline (Figma 1:4176 / 1:4232), driven by order.status. Only
 * data we actually have is shown: the confirmation date/time from createdAt
 * and the fixed expected delivery date. Later statuses mark their steps done;
 * their dates and events will come from real tracking data in a future phase.
 */
export function trackTimeline(order: Order, expectedDelivery: string): TrackStep[] {
  const rank = statusRank[order.status];
  const delivered = rank >= statusRank.delivered;
  return [
    {
      key: "confirmed",
      title: "Order Confirmed",
      date: formatTrackDate(order.createdAt),
      events: [{ message: "Your Order has been placed.", time: formatTrackTimestamp(order.createdAt) }],
      done: true,
    },
    { key: "shipped", title: "Shipped", events: [], done: rank >= statusRank.shipped },
    {
      key: "out_for_delivery",
      title: "Out For Delivery",
      events: [],
      done: rank >= statusRank.out_for_delivery,
    },
    {
      key: "delivery",
      title: delivered ? "Delivered" : "Delivery Expected By",
      date: delivered ? undefined : expectedDelivery,
      events: [],
      done: delivered,
    },
  ];
}

/** Case-insensitive match on order id and any line's product name. */
export function orderMatches(order: Order, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    order.id.toLowerCase().includes(q) || order.lines.some((line) => line.name.toLowerCase().includes(q))
  );
}

/**
 * Builds the mock order for the simulated payment from the selected Bag
 * items. Totals use the same computeBagTotals as the Bag and Order Summary.
 */
export function buildOrder({
  bagItems,
  catalog,
  address,
  upiApp,
}: {
  bagItems: CartItem[];
  catalog: Record<string, BagProduct>;
  address: Address;
  upiApp: UpiAppId;
}): Order {
  const selected = bagItems.filter((item) => isSelected(item) && catalog[item.productId]);
  const totals = computeBagTotals(bagItems, catalog);

  return {
    id: `OD${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "confirmed",
    lines: selected.map((item) => {
      const product = catalog[item.productId];
      return {
        bagItemId: item.id,
        productId: item.productId,
        name: product.name,
        category: product.category,
        image: product.image,
        size: item.size,
        quantity: item.quantity,
        unitPrice: product.price,
        customization: item.customization ? { ...item.customization } : undefined,
      };
    }),
    address: { ...address },
    payment: { method: "upi", app: upiApp },
    totals: {
      subtotal: totals.subtotal,
      discount: 0,
      delivery: totals.delivery,
      platformFee: totals.platformFee,
      total: totals.total,
    },
  };
}

/**
 * Plain-text summary of an order for "Send Order Details" (shared as text —
 * orders live on this device only, so there is no link to share).
 */
export function orderSummaryText(order: Order): string {
  const money = (n: number) => `₹ ${n.toFixed(2)}`;
  const d = new Date(order.createdAt);
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; // "19 Sep 2026"
  const lines = order.lines.map((line, i) => {
    const total = line.unitPrice * line.quantity;
    const price =
      line.quantity > 1 ? `${money(line.unitPrice)} × ${line.quantity} = ${money(total)}` : money(total);
    const custom = line.customization ? " (Customised)" : "";
    return `${i + 1}. ${line.name}${custom}\n   Size ${line.size} · Qty ${line.quantity} · ${price}`;
  });
  const { totals } = order;
  return [
    `Custom Stride order ${order.id}`,
    `Placed on ${date}`,
    "",
    "Items:",
    ...lines,
    "",
    `Subtotal: ${money(totals.subtotal)}`,
    ...(totals.discount ? [`Discount: -${money(totals.discount)}`] : []),
    `Delivery: ${money(totals.delivery)}`,
    `Platform fee: ${money(totals.platformFee)}`,
    `Total: ${money(totals.total)}`,
  ].join("\n");
}
