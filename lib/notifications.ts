import { formatEventDate } from "@/lib/orders";

/**
 * A notification row as the Notifications screen shows it. Notifications are
 * stored in Supabase (created by place_order(), one per order); `orderId` is
 * the related order number, used for the link to the order.
 */
export interface OrderNotification {
  orderId: string;
  createdAt: string;
  title: string;
  body: string;
}

export interface NotificationDay {
  /** Local calendar day, e.g. "Tue Nov 24 2026". */
  key: string;
  /** Day heading, e.g. "19 Sep 2026". */
  label: string;
  items: OrderNotification[];
}

/** Notifications day heading, e.g. "19 Sep 2026". */
export function formatNotificationDate(iso: string): string {
  return formatEventDate(iso);
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
