import type { Metadata } from "next";
import { AdminBrandsView } from "@/components/admin/AdminBrandsView";

export const metadata: Metadata = { title: "Brands" };

/** Brands — read-only catalogue list (editing comes later). */
export default function AdminBrandsPage() {
  return <AdminBrandsView />;
}
