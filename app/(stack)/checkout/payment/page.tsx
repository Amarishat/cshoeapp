import type { Metadata } from "next";
import { PaymentView } from "@/components/checkout/PaymentView";
import { AppHeader } from "@/components/layout/AppHeader";

export const metadata: Metadata = { title: "Payments" };

/** Checkout · Payment — Figma frame 1:4858. Data is loaded from Supabase by PaymentView. */
export default function PaymentPage() {
  return (
    <>
      <AppHeader leading="back" backHref="/checkout/order-summary" title="Payments" />
      <PaymentView />
    </>
  );
}
