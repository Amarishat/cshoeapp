import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPageView } from "@/components/product/ProductPageView";
import { PRODUCT_PAGES } from "@/lib/data/productPages";

// Only products with a built page (V1: Sabrina 2 EP); any other slug is a 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  return PRODUCT_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = PRODUCT_PAGES.find((p) => p.slug === slug);
  return { title: page?.name };
}

/** Product — Figma frame 1:2478. Product data is loaded from Supabase by ProductPageView. */
export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const page = PRODUCT_PAGES.find((p) => p.slug === slug);
  if (!page) notFound();

  return <ProductPageView slug={page.slug} name={page.name} shortName={page.shortName} />;
}
