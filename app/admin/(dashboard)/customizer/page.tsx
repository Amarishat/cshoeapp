import type { Metadata } from "next";
import { AdminCustomizerView } from "@/components/admin/AdminCustomizerView";

export const metadata: Metadata = { title: "Customizer" };

/** Customizer — read-only list of products with a customiser configuration. */
export default function AdminCustomizerPage() {
  return <AdminCustomizerView />;
}
