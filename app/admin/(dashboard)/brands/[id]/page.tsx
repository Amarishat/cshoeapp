import type { Metadata } from "next";
import { AdminBrandEditor } from "@/components/admin/AdminBrandEditor";

export const metadata: Metadata = { title: "Edit brand" };

/** Edit one brand's fields. The brand is loaded by the editor. */
export default async function AdminBrandEditPage({ params }: PageProps<"/admin/brands/[id]">) {
  const { id } = await params;
  return <AdminBrandEditor brandId={id} />;
}
