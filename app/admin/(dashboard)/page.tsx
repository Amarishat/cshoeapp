import type { Metadata } from "next";
import { AdminDashboardView } from "@/components/admin/AdminDashboardView";

export const metadata: Metadata = { title: "Dashboard" };

/** Admin home — catalogue and order totals, recent orders and links into each screen. */
export default function AdminDashboardPage() {
  return <AdminDashboardView />;
}
