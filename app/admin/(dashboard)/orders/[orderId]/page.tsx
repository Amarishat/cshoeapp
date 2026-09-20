import type { Metadata } from "next";
import { AdminOrderDetail } from "@/components/admin/AdminOrderDetail";

export const metadata: Metadata = { title: "Order" };

/** One order in full (read-only). `orderId` is the order number, as in the list. */
export default async function AdminOrderDetailPage({
  params,
}: PageProps<"/admin/orders/[orderId]">) {
  const { orderId } = await params;
  return <AdminOrderDetail orderNumber={orderId} />;
}
