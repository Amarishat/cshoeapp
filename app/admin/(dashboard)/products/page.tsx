import type { Metadata } from "next";
import { AdminProductsView } from "@/components/admin/AdminProductsView";

export const metadata: Metadata = { title: "Products" };

/** Products — read-only catalogue list (editing comes later). */
export default function AdminProductsPage() {
  return <AdminProductsView />;
}
