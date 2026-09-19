import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { OrderDetailsView } from "@/components/orders/OrderDetailsView";

export const metadata: Metadata = { title: "Order Details" };

/** Order Details — Figma frame 1:3878. Orders live in the browser, so the id is resolved client-side. */
export default async function OrderDetailsPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;

  return (
    <>
      <AppHeader leading="back" backHref="/orders" title="Order Details" actions={<BagButton />} />
      <OrderDetailsView orderId={decodeURIComponent(id)} />
    </>
  );
}
