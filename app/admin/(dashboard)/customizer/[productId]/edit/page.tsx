import type { Metadata } from "next";
import { AdminCustomizerEditor } from "@/components/admin/AdminCustomizerEditor";

export const metadata: Metadata = { title: "Edit customizer" };

/** Editing a product's customiser configuration, parts and colours. */
export default async function AdminCustomizerEditPage({
  params,
}: PageProps<"/admin/customizer/[productId]/edit">) {
  const { productId } = await params;
  return <AdminCustomizerEditor productId={productId} />;
}
