import { formatGrouped } from "@/lib/pricing";
import type { Order } from "@/lib/types";

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** A notification derived from a real order. Never stored — rebuilt from the Orders store. */
export interface OrderNotification {
  orderId: string;
  createdAt: string;
  title: string;
  body: string;
}

export interface NotificationDay {
  /** Local calendar day, e.g. "Tue Nov 24 2026". */
  key: string;
  /** Figma heading style, e.g. "24. November" (no year). */
  label: string;
  items: OrderNotification[];
}

/** "24. November" — Figma 1:6944 date heading. */
export function formatNotificationDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}. ${MONTHS_LONG[d.getMonth()]}`;
}

/** One "Order confirmed" notification per order, newest first. */
export function orderNotifications(orders: Order[]): OrderNotification[] {
  return [...orders]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((order) => {
      const [first, ...rest] = order.lines;
      const more = rest.length > 0 ? ` + ${rest.length} more` : "";
      return {
        orderId: order.id,
        createdAt: order.createdAt,
        title: "Order confirmed",
        body: `Order ${order.id} · ${first?.name ?? "Your items"}${more} · ${formatGrouped(order.totals.total)}`,
      };
    });
}

/** Groups (already sorted) notifications by local calendar day. */
export function groupByDay(items: OrderNotification[]): NotificationDay[] {
  const days: NotificationDay[] = [];
  for (const item of items) {
    const key = new Date(item.createdAt).toDateString();
    const day = days.at(-1);
    if (day?.key === key) day.items.push(item);
    else days.push({ key, label: formatNotificationDate(item.createdAt), items: [item] });
  }
  return days;
}
