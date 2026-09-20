import type { Metadata } from "next";
import { AdminOrdersView } from "@/components/admin/AdminOrdersView";

export const metadata: Metadata = { title: "Orders" };

/** Orders — read-only list (no create, edit or cancel). */
export default function AdminOrdersPage() {
  return <AdminOrdersView />;
}
