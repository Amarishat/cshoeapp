import type { Metadata } from "next";
import { OrderSummaryView } from "@/components/checkout/OrderSummaryView";
import { AppHeader } from "@/components/layout/AppHeader";

export const metadata: Metadata = { title: "Order Summary" };

/** Checkout · Order Summary — Figma frame 1:3495. Data is loaded from Supabase by OrderSummaryView. */
export default function OrderSummaryPage() {
  return (
    <>
      <AppHeader leading="back" backHref="/checkout/address" title="Order Summary" />
      <OrderSummaryView />
    </>
  );
}
