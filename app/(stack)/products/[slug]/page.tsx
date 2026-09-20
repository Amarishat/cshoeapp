import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPageView } from "@/components/product/ProductPageView";
import { getProductPageMeta, listProductPageSlugs, type ProductPageMeta } from "@/lib/data/productPages";

/**
 * Products with `has_product_page` are prerendered; one enabled later is
 * rendered on demand (no code change, no rebuild). A slug without a page is
 * a 404.
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const slugs = await listProductPageSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    // Supabase unreachable at build time: nothing is prerendered, and every
    // product page is rendered on demand instead.
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await getProductPageMeta(slug);
    return { title: page?.name };
  } catch {
    return {};
  }
}

/** Product — Figma frame 1:2478. Product data is loaded from Supabase by ProductPageView. */
export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;

  let page: ProductPageMeta | null;
  try {
    page = await getProductPageMeta(slug);
  } catch {
    // Supabase couldn't be reached from the server: let the browser load the
    // product, where a failure is shown with a retry.
    return <ProductPageView slug={slug} />;
  }
  // Unknown product, or one without a page.
  if (!page) notFound();

  return <ProductPageView slug={page.slug} name={page.name} shortName={page.shortName} />;
}
