import type { Metadata } from "next";
import { OrderSummaryView } from "@/components/checkout/OrderSummaryView";
import { AppHeader } from "@/components/layout/AppHeader";
import { getBagCatalog } from "@/lib/data/bagCatalog";

export const metadata: Metadata = { title: "Order Summary" };

/** Checkout · Order Summary — Figma frame 1:3495. */
export default async function OrderSummaryPage() {
  const catalog = await getBagCatalog();

  return (
    <>
      <AppHeader leading="back" backHref="/checkout/address" title="Order Summary" />
      <OrderSummaryView catalog={catalog} />
    </>
  );
}
