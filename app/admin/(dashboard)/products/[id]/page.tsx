import type { Metadata } from "next";
import { AdminProductEditor } from "@/components/admin/AdminProductEditor";

export const metadata: Metadata = { title: "Edit product" };

/** Edit one product's scalar fields. The product itself is loaded by the editor. */
export default async function AdminProductEditPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  return <AdminProductEditor productId={id} />;
}
