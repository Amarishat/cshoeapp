"use client";

import { ButtonLink } from "@/components/ui/Button";
import { MOCK_DELIVERY_DATE } from "@/lib/data/delivery";
import { trackTimeline } from "@/lib/orders";
import { useOrdersStore } from "@/lib/store/orders";
import { useStoreHydrated } from "@/lib/store/useStoreHydrated";
import { TrackTimeline } from "./TrackTimeline";

/**
 * Track Order — Figma 1:4176 (with the "Status" header from 1:4232).
 * Reads only from the orders store. No live tracking, courier or map in V1.
 */
export function TrackView({ orderId }: { orderId: string }) {
  const hydrated = useStoreHydrated(useOrdersStore.persist);
  const order = useOrdersStore((s) => s.orders.find((o) => o.id === orderId));

  if (!hydrated) return <div className="flex-1" aria-busy="true" />;

  if (!order) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-gutter pt-24 pb-32 text-center">
        <h2 className="text-body font-medium">Order not found</h2>
        <p className="mt-2 text-secondary text-ink/50">We couldn’t find an order with this ID.</p>
        <ButtonLink href="/orders" size="lg" className="mt-8 w-[222px]">
          Back to My Orders
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mt-[30px] px-gutter pb-10">
      <p className="sr-only">Order {order.id}</p>
      <TrackTimeline steps={trackTimeline(order, MOCK_DELIVERY_DATE)} />
    </div>
  );
}
