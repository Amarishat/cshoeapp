"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MOCK_DELIVERY_DATE } from "@/lib/data/delivery";
import { formatPrice } from "@/lib/pricing";
import { useBagStore } from "@/lib/store/bag";
import { useOrdersStore } from "@/lib/store/orders";
import { useStoreHydrated } from "@/lib/store/useStoreHydrated";

/**
 * Payment Successful — Figma frame 1:4956. Figma's Lottie animation is
 * replaced by a CSS check mark; its "Successfull" typo is fixed. Instead of
 * Figma's 548px animation area, the check, heading, order details and
 * buttons are centred as one group. The arrival date is the same V1 estimate
 * shown on My Orders, Order Details and Track.
 */
export function PaymentSuccess() {
  const router = useRouter();
  const ordersHydrated = useStoreHydrated(useOrdersStore.persist);
  const order = useOrdersStore((s) => s.orders.find((o) => o.id === s.lastPlacedOrderId));
  const removeItems = useBagStore((s) => s.removeItems);

  // Clear the items that were just ordered from the Bag (idempotent).
  useEffect(() => {
    if (order) removeItems(order.lines.map((line) => line.bagItemId));
  }, [order, removeItems]);

  useEffect(() => {
    if (ordersHydrated && !order) router.replace("/");
  }, [ordersHydrated, order, router]);

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
            ["Amount Paid", formatPrice(order.totals.total)],
            ["Arriving by", MOCK_DELIVERY_DATE],
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
