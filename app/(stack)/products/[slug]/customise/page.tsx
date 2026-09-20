import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomizerPageView } from "@/components/customizer/CustomizerPageView";
import { CUSTOMIZER_PAGES } from "@/lib/data/customizerPages";

// V1: only products with a built customiser (Nike Air Force); any other slug is a 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  return CUSTOMIZER_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]/customise">): Promise<Metadata> {
  const { slug } = await params;
  const page = CUSTOMIZER_PAGES.find((p) => p.slug === slug);
  return { title: page ? `Customise ${page.title}` : undefined };
}

/**
 * Customizer — Figma frame 1:6606. The customisation config is loaded from
 * Supabase by CustomizerPageView. With `?item=<cart item id>` (from the Bag's
 * Edit link) it edits that Bag item's design instead of adding a new one.
 */
export default async function CustomisePage({
  params,
  searchParams,
}: PageProps<"/products/[slug]/customise">) {
  const { slug } = await params;
  const { item } = await searchParams;
  const page = CUSTOMIZER_PAGES.find((p) => p.slug === slug);
  if (!page) notFound();

  return (
    <CustomizerPageView
      slug={page.slug}
      title={page.title}
      cartItemId={typeof item === "string" ? item : null}
    />
  );
}
