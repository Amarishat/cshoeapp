import { formatAmount } from "@/lib/pricing";
import type { Order, OrderStatus } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "19 Sep 2026" — the one display format for real order/event dates
 * (placed, confirmed, notifications, shared text). Display only; the expected
 * delivery date below keeps Figma's own format ("Oct 11, Mon").
 */
export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** My Orders tracker date, e.g. "19 Sep 2026". */
export function formatOrderDate(iso: string): string {
  return formatEventDate(iso);
}

// ——— Expected delivery (Figma 1:3495 shows it as "Oct 11, Mon") ———

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Days from the order date to the expected delivery — V1's one estimate. */
export const DELIVERY_DAYS = 21;

/**
 * When an order is expected: DELIVERY_DAYS after it was placed, or after
 * today when there is no order yet (Order Summary, before checkout). The days
 * are added to the local calendar date rather than to a timestamp, so the
 * date shown can't slip by one around midnight or a daylight-saving change.
 */
export function expectedDeliveryDate(orderedAt?: string): Date {
  const placed = orderedAt ? new Date(orderedAt) : new Date();
  return new Date(placed.getFullYear(), placed.getMonth(), placed.getDate() + DELIVERY_DAYS);
}

/** "Oct 11, Mon" — Payment Success and Track Order. */
export function formatDeliveryDate(orderedAt?: string): string {
  const d = expectedDeliveryDate(orderedAt);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${WEEKDAYS[d.getDay()]}`;
}

/** "Oct 11" — Order Details tracker ("Expected Delivery, Oct 11"). */
export function formatDeliveryDay(orderedAt?: string): string {
  const d = expectedDeliveryDate(orderedAt);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Order Summary item row. */
export function deliveryByLabel(orderedAt?: string): string {
  return `Delivery by ${formatDeliveryDate(orderedAt)}`;
}

/** My Orders card and Order Details. */
export function arrivingByLabel(orderedAt?: string): string {
  return `Arriving by ${formatDeliveryDate(orderedAt)}`;
}

export interface ProgressStep {
  label: string;
  done: boolean;
  date?: string;
}

/** The statuses on the way to delivery; "cancelled" is an end state off that path. */
export type DeliveryStatus = Exclude<OrderStatus, "cancelled">;

export const statusRank: Record<DeliveryStatus, number> = {
  confirmed: 0,
  shipped: 1,
  out_for_delivery: 2,
  delivered: 3,
};

/** "Cancelled on 19 Sep 2026", or just "Cancelled" when the time isn't known. */
export function cancelledLabel(order: Order): string {
  return order.cancelledAt ? `Cancelled on ${formatEventDate(order.cancelledAt)}` : "Cancelled";
}

/** A recorded stage time as the trackers' date, e.g. "19 Sep 2026"; nothing when it wasn't recorded. */
function dateOf(iso: string | null): string | undefined {
  return iso ? formatOrderDate(iso) : undefined;
}

/** "Shipped, 19 Sep 2026" when the time was recorded, otherwise just "Shipped". */
function withDate(label: string, iso: string | null): string {
  return iso ? `${label}, ${formatShortOrderDate(iso)}` : label;
}

/**
 * Tracker steps for an order (My Orders card), derived from its status. A
 * cancelled order shows confirmed → cancelled instead of the delivery steps.
 * The middle step reads "Out for Delivery" once the order is out for
 * delivery, so it's told apart from just shipped. Each stage shows the date
 * it was reached when that was recorded (020); older orders show none.
 */
export function orderProgress(order: Order): ProgressStep[] {
  if (order.status === "cancelled") {
    return [
      { label: "Order Confirmed", done: true, date: formatOrderDate(order.createdAt) },
      { label: "Cancelled", done: true, date: order.cancelledAt ? formatOrderDate(order.cancelledAt) : undefined },
    ];
  }
  const rank = statusRank[order.status];
  return [
    { label: "Order Confirmed", done: true, date: formatOrderDate(order.createdAt) },
    order.status === "out_for_delivery"
      ? { label: "Out for Delivery", done: true, date: dateOf(order.outForDeliveryAt) }
      : { label: "Shipped", done: rank >= statusRank.shipped, date: dateOf(order.shippedAt) },
    { label: "Delivered", done: rank >= statusRank.delivered, date: dateOf(order.deliveredAt) },
  ];
}

/** Order Details tracker date ("Order Confirmed, 19 Sep 2026"). */
export function formatShortOrderDate(iso: string): string {
  return formatEventDate(iso);
}

/** How an order's status reads: still on its way, delivered, or cancelled. */
export type OrderStatusTone = "progress" | "delivered" | "cancelled";

/**
 * Status-specific content for Order Details and the My Orders card.
 * Confirmed keeps the V1 "In Progress" wording; shipped and out for delivery
 * name their stage; delivered is the completed variant from Figma 1:3715
 * ("Completed Orders", "Delivered on <date>" — just "Delivered" when the time
 * wasn't recorded — and no arrival date); cancelled has no arrival date either.
 */
export function orderStatusView(order: Order): {
  sectionTitle: string;
  label: string;
  showArrival: boolean;
  cancelled: boolean;
  tone: OrderStatusTone;
} {
  const inProgress = { sectionTitle: "In Progress Orders", showArrival: true, cancelled: false, tone: "progress" } as const;
  switch (order.status) {
    case "cancelled":
      return {
        sectionTitle: "Cancelled Order",
        label: cancelledLabel(order),
        showArrival: false,
        cancelled: true,
        tone: "cancelled",
      };
    case "delivered":
      return {
        sectionTitle: "Completed Orders",
        // "Delivered on 25 Sep 2026" (Figma 1:3715) when the time was recorded.
        label: order.deliveredAt ? `Delivered on ${formatEventDate(order.deliveredAt)}` : "Delivered",
        showArrival: false,
        cancelled: false,
        tone: "delivered",
      };
    case "out_for_delivery":
      return { ...inProgress, label: "Out for delivery" };
    case "shipped":
      return { ...inProgress, label: "Shipped" };
    case "confirmed":
      return { ...inProgress, label: "In Progress" };
  }
}

/**
 * Vertical tracker steps for Order Details (Figma 1:3892). Confirmed, then
 * each stage reached (shipped, out for delivery), then the expected delivery
 * still to come. A delivered order shows confirmed → delivered (Figma 1:3715)
 * and a cancelled one confirmed → cancelled — neither with a future date.
 */
export function orderDetailProgress(order: Order, expectedDelivery: string): ProgressStep[] {
  const steps: ProgressStep[] = [
    { label: `Order Confirmed, ${formatShortOrderDate(order.createdAt)}`, done: true },
  ];
  if (order.status === "cancelled") {
    steps.push({
      label: order.cancelledAt ? `Cancelled, ${formatShortOrderDate(order.cancelledAt)}` : "Cancelled",
      done: true,
    });
    return steps;
  }
  if (order.status === "delivered") {
    steps.push({ label: withDate("Delivered", order.deliveredAt), done: true });
    return steps;
  }
  const rank = statusRank[order.status];
  if (rank >= statusRank.shipped) steps.push({ label: withDate("Shipped", order.shippedAt), done: true });
  if (rank >= statusRank.out_for_delivery) {
    steps.push({ label: withDate("Out for delivery", order.outForDeliveryAt), done: true });
  }
  steps.push({ label: `Expected Delivery, ${expectedDelivery}`, done: false });
  return steps;
}

/** Track Order step date, e.g. "19 Sep 2026". */
export function formatTrackDate(iso: string): string {
  return formatEventDate(iso);
}

/** "19 Sep 2026, 1:55pm" — Track Order event timestamp. */
export function formatTrackTimestamp(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const time = `${hours % 12 || 12}:${minutes}${hours < 12 ? "am" : "pm"}`;
  return `${formatEventDate(iso)}, ${time}`;
}

export interface TrackEvent {
  message: string;
  time: string;
}

export interface TrackStep {
  key: "confirmed" | "shipped" | "out_for_delivery" | "delivery" | "cancelled";
  title: string;
  date?: string;
  events: TrackEvent[];
  done: boolean;
}

/**
 * Track Order timeline (Figma 1:4176 / 1:4232), driven by order.status. Only
 * data we actually have is shown: the confirmation date/time from createdAt
 * and the fixed expected delivery date. Later statuses mark their steps done,
 * with the date and an event when the time was recorded (020); older orders
 * show the step without them.
 * A cancelled order shows its confirmation and then the cancellation, with no
 * delivery steps.
 */
export function trackTimeline(order: Order, expectedDelivery: string): TrackStep[] {
  const confirmed: TrackStep = {
    key: "confirmed",
    title: "Order Confirmed",
    date: formatTrackDate(order.createdAt),
    events: [{ message: "Your Order has been placed.", time: formatTrackTimestamp(order.createdAt) }],
    done: true,
  };
  if (order.status === "cancelled") {
    const at = order.cancelledAt;
    return [
      confirmed,
      {
        key: "cancelled",
        title: "Order Cancelled",
        date: at ? formatTrackDate(at) : undefined,
        events: at ? [{ message: "Your Order has been cancelled.", time: formatTrackTimestamp(at) }] : [],
        done: true,
      },
    ];
  }
  const rank = statusRank[order.status];
  const delivered = rank >= statusRank.delivered;
  // A reached stage with a recorded time (020) shows its date and an event, like "Order Confirmed".
  const reached = (at: string | null, message: string) => ({
    date: at ? formatTrackDate(at) : undefined,
    events: at ? [{ message, time: formatTrackTimestamp(at) }] : [],
  });
  return [
    confirmed,
    {
      key: "shipped",
      title: "Shipped",
      ...reached(order.shippedAt, "Your Order has been shipped."),
      done: rank >= statusRank.shipped,
    },
    {
      key: "out_for_delivery",
      title: "Out For Delivery",
      ...reached(order.outForDeliveryAt, "Your Order is out for delivery."),
      done: rank >= statusRank.out_for_delivery,
    },
    delivered
      ? {
          key: "delivery",
          title: "Delivered",
          ...reached(order.deliveredAt, "Your Order has been delivered."),
          done: true,
        }
      : { key: "delivery", title: "Delivery Expected By", date: expectedDelivery, events: [], done: false },
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
 * Plain-text summary of an order for "Send Order Details" (shared as text —
 * orders live on this device only, so there is no link to share).
 */
export function orderSummaryText(order: Order): string {
  const date = formatEventDate(order.createdAt);
  const lines = order.lines.map((line, i) => {
    const total = line.unitPrice * line.quantity;
    const price =
      line.quantity > 1 ? `${formatAmount(line.unitPrice)} × ${line.quantity} = ${formatAmount(total)}` : formatAmount(total);
    const custom = line.customization ? " (Customised)" : "";
    return `${i + 1}. ${line.name}${custom}\n   Size ${line.size} · Qty ${line.quantity} · ${price}`;
  });
  const { totals } = order;
  return [
    `Custom Stride order ${order.id}`,
    `Placed on ${date}`,
    ...(order.status === "cancelled" ? [cancelledLabel(order)] : []),
    "",
    "Items:",
    ...lines,
    "",
    `Subtotal: ${formatAmount(totals.subtotal)}`,
    ...(totals.discount ? [`Discount: -${formatAmount(totals.discount)}`] : []),
    `Delivery: ${formatAmount(totals.delivery)}`,
    `Platform fee: ${formatAmount(totals.platformFee)}`,
    `Total: ${formatAmount(totals.total)}`,
  ].join("\n");
}
