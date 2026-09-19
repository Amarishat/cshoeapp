"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useBagStore } from "@/lib/store/bag";
import { useOrdersStore } from "@/lib/store/orders";
import { useStoreHydrated } from "@/lib/store/useStoreHydrated";

/**
 * Payment Successful — Figma frame 1:4956. Figma's Lottie animation is
 * replaced by a CSS check mark; its "Successfull" typo is fixed.
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
    <div className="flex flex-1 flex-col items-center pb-10">
      {/* Animation area: 430×548 from y=52 in Figma */}
      <div className="mt-[52px] flex h-[548px] w-full items-center justify-center">
        <span className="flex size-[140px] items-center justify-center rounded-full bg-success motion-safe:animate-pop-in">
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
      </div>

      <h1 role="status" className="mt-[26px] text-center text-[25px] font-semibold text-success">
        Payment Successful
      </h1>
      <p className="sr-only">Order {order.id} has been placed.</p>

      <div className="mt-[41px] flex w-full flex-col items-center gap-[26px] px-gutter">
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
