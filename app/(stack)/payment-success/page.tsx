import type { Metadata } from "next";
import { PaymentSuccess } from "@/components/checkout/PaymentSuccess";

export const metadata: Metadata = { title: "Payment Successful" };

/**
 * Lives outside /checkout on purpose: after the order the Bag no longer has
 * the ordered items, and the checkout guard would otherwise redirect to /bag.
 * `?order=` is the database order number returned by place_order().
 */
export default async function PaymentSuccessPage({ searchParams }: PageProps<"/payment-success">) {
  const { order } = await searchParams;
  return <PaymentSuccess orderNumber={typeof order === "string" ? order : null} />;
}
