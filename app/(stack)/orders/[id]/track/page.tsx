import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { TrackView } from "@/components/orders/TrackView";

export const metadata: Metadata = { title: "Order Status" };

/** Track Order — Figma frame 1:4176 (header from 1:4232). */
export default async function TrackOrderPage({ params }: PageProps<"/orders/[id]/track">) {
  const { id } = await params;
  const orderId = decodeURIComponent(id);

  return (
    <>
      <AppHeader leading="back" backHref={`/orders/${encodeURIComponent(orderId)}`} title="Status" />
      <TrackView orderId={orderId} />
    </>
  );
}
