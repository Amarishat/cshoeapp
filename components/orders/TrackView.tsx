"use client";

import { CatalogueError } from "@/components/product/CatalogueStatus";
import { ButtonLink } from "@/components/ui/Button";
import { getOrderByNumber } from "@/lib/data/userOrders";
import { formatDeliveryDate, trackTimeline } from "@/lib/orders";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";
import { TrackTimeline } from "./TrackTimeline";

/**
 * Track Order — Figma 1:4176 (with the "Status" header from 1:4232).
 * `orderId` is the Supabase order number from the URL; the order is read from
 * Supabase (orders saved only on this device by V1 are not shown). No live
 * tracking, courier or map in V1.
 */
export function TrackView({ orderId }: { orderId: string }) {
  const { state, retry } = useCatalogueLoad(getOrderByNumber, orderId);

  if (state.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading order status" className="mt-[30px] animate-pulse px-gutter pb-10">
        <div className="h-6 w-2/3 rounded bg-surface" />
        <div className="mt-4 h-10 w-1/2 rounded bg-surface" />
        <div className="mt-8 h-6 w-1/3 rounded bg-surface" />
        <div className="mt-8 h-6 w-1/2 rounded bg-surface" />
        <div className="mt-8 h-6 w-2/3 rounded bg-surface" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="mt-[30px]">
        <CatalogueError title="Couldn’t load this order." message={state.message} onRetry={retry} />
      </div>
    );
  }

  const order = state.data;
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
      <TrackTimeline steps={trackTimeline(order, formatDeliveryDate(order.createdAt))} />
    </div>
  );
}
