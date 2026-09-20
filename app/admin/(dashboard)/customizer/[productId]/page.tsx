import type { Metadata } from "next";
import { AdminCustomizerDetail } from "@/components/admin/AdminCustomizerDetail";

export const metadata: Metadata = { title: "Customizer detail" };

/** One product's customiser configuration, parts and colours (read-only). */
export default async function AdminCustomizerDetailPage({
  params,
}: PageProps<"/admin/customizer/[productId]">) {
  const { productId } = await params;
  return <AdminCustomizerDetail productId={productId} />;
}
