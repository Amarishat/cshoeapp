import type { Metadata } from "next";
import { PaymentView } from "@/components/checkout/PaymentView";
import { AppHeader } from "@/components/layout/AppHeader";
import { getBagCatalog } from "@/lib/data/bagCatalog";

export const metadata: Metadata = { title: "Payments" };

/** Checkout · Payment — Figma frame 1:4858. */
export default async function PaymentPage() {
  const catalog = await getBagCatalog();

  return (
    <>
      <AppHeader leading="back" backHref="/checkout/order-summary" title="Payments" />
      <PaymentView catalog={catalog} />
    </>
  );
}
