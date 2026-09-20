import type { Metadata } from "next";
import { AdminProductEditor } from "@/components/admin/AdminProductEditor";
import { AdminProductImages } from "@/components/admin/AdminProductImages";
import { AdminProductSizes } from "@/components/admin/AdminProductSizes";

export const metadata: Metadata = { title: "Edit product" };

/**
 * Edit one product: the scalar fields, then its gallery rows and sizes
 * (both read-only). Each section loads itself from Supabase.
 */
export default async function AdminProductEditPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  return (
    <>
      <AdminProductEditor productId={id} />
      <AdminProductImages productId={id} />
      <AdminProductSizes productId={id} />
    </>
  );
}
