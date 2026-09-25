"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { getOrderByNumber } from "@/lib/data/userOrders";
import { cancelledLabel, formatDeliveryDate, formatEventDate, orderStatusView } from "@/lib/orders";
import { formatPrice } from "@/lib/pricing";
import type { Order } from "@/lib/types";
import { useBagStore } from "@/lib/store/bag";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

/** "Shipped on 20 Sep 2026", or just "Shipped" when the time wasn't recorded. */
function onDate(label: string, iso: string | null): string {
  return iso ? `${label} on ${formatEventDate(iso)}` : label;
}

/**
 * The last detail row: the arrival estimate while the order is confirmed,
 * otherwise its current status with the recorded date when there is one.
 */
function whereItIs(order: Order): readonly [string, string] {
  switch (order.status) {
    case "confirmed":
      return ["Arriving by", formatDeliveryDate(order.createdAt)];
    case "shipped":
      return ["Status", onDate("Shipped", order.shippedAt)];
    case "out_for_delivery":
      return ["Status", onDate("Out for delivery", order.outForDeliveryAt)];
    case "delivered":
      // "Delivered on 25 Sep 2026" / "Delivered", as on My Orders and Order Details.
      return ["Status", orderStatusView(order).label];
    case "cancelled":
      return ["Status", cancelledLabel(order)];
  }
}

/**
 * Payment Successful — Figma frame 1:4956. Figma's Lottie animation is
 * replaced by a CSS check mark; its "Successfull" typo is fixed. Instead of
 * Figma's 548px animation area, the check, heading, order details and
 * buttons are centred as one group. While the order is confirmed it shows the
 * same V1 arrival estimate as My Orders, Order Details and Track; opened again
 * later, it shows where the order is now instead (see `whereItIs`).
 *
 * The order is read from Supabase by the order number place_order() returned
 * (`?order=`); everything shown comes from the database order.
 */
export function PaymentSuccess({ orderNumber }: { orderNumber: string | null }) {
  const router = useRouter();
  const refreshBag = useBagStore((s) => s.refresh);
  const { state, retry } = useCatalogueLoad(getOrderByNumber, orderNumber ?? "");
  const order = state.status === "ready" ? state.data : null;
  const missing = !orderNumber || (state.status === "ready" && !state.data);

  // place_order() already removed the ordered rows in Supabase: reload the Bag's copy.
  useEffect(() => {
    void refreshBag();
  }, [refreshBag]);

  useEffect(() => {
    if (missing) router.replace("/");
  }, [missing, router]);

  if (state.status === "error") {
    return (
      <div className="flex flex-1 flex-col justify-center py-10">
        <CatalogueError title="Couldn’t load your order." message={state.message} onRetry={retry} />
      </div>
    );
  }
  if (!order) return <div className="flex-1" aria-busy="true" />;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-gutter py-10">
      <span className="flex size-[140px] shrink-0 items-center justify-center rounded-full bg-success motion-safe:animate-pop-in">
        <svg viewBox="0 0 52 52" className="size-[72px]" aria-hidden>
          <path
            d="M14 27l8 8 16-17"
            fill="none"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="60"
            className="motion-safe:animate-draw-check"
          />
        </svg>
      </span>

      <h1 role="status" className="mt-8 text-center text-[25px] font-semibold text-success">
        Payment Successful
      </h1>

      {/* Supporting details, the same width as the buttons below. */}
      <dl className="mt-6 flex w-full max-w-[262px] flex-col gap-2 rounded-[11px] bg-surface px-4 py-3.5 text-[15px]">
        {(
          [
            ["Order ID", order.id],
            // What was paid at checkout — not the current total, which item edits can change.
            ["Amount Paid", order.amountPaid === null ? "—" : formatPrice(order.amountPaid)],
            whereItIs(order),
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-ink/50">{label}</dt>
            <dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 flex w-full flex-col items-center gap-[26px]">
        <Link
          href="/orders"
          className="flex h-[62px] w-full max-w-[262px] items-center justify-center rounded-[31px] bg-black text-heading font-medium text-white"
        >
          Track Order
        </Link>
        <Link
          href="/"
          className="flex h-[62px] w-full max-w-[262px] items-center justify-center rounded-[31px] border border-border bg-white text-heading font-medium"
        >
          Go Back To Home
        </Link>
      </div>
    </div>
  );
}
