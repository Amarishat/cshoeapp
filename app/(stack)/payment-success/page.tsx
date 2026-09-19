import type { Metadata } from "next";
import { PaymentSuccess } from "@/components/checkout/PaymentSuccess";

export const metadata: Metadata = { title: "Payment Successful" };

/**
 * Lives outside /checkout on purpose: the ordered items are removed from the
 * Bag here, and the checkout guard would otherwise redirect to /bag.
 */
export default function PaymentSuccessPage() {
  return <PaymentSuccess />;
}
