import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { OrdersView } from "@/components/orders/OrdersView";

export const metadata: Metadata = { title: "My Orders" };

/** My Orders — Figma frame 1:3647. `?q=` pre-fills the search (from Order Details). */
export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const { q } = await searchParams;

  return (
    <>
      <AppHeader leading="back" title="My Orders" actions={<BagButton />} />
      <OrdersView initialQuery={typeof q === "string" ? q : ""} />
    </>
  );
}
