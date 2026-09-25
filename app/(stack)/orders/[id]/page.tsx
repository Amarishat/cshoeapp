import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { OrderDetailsView } from "@/components/orders/OrderDetailsView";
import { locations } from "@/lib/data/locations";

export const metadata: Metadata = { title: "Order Details" };

/** Order Details — Figma frame 1:3878. The id is the Supabase order number; the order is loaded client-side (guest session). */
export default async function OrderDetailsPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;

  return (
    <>
      <AppHeader leading="back" backHref="/orders" title="Order Details" actions={<BagButton />} />
      <OrderDetailsView orderId={decodeURIComponent(id)} locations={locations} />
    </>
  );
}
