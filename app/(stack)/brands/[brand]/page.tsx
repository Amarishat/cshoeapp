import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandPageView } from "@/components/brands/BrandPageView";
import { BagButton } from "@/components/layout/BagButton";
import { SearchableHeader } from "@/components/layout/SearchableHeader";
import { BRAND_PAGES } from "@/lib/data/brandCatalogue";

// Only the brand pages that exist; any other slug is a 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  return BRAND_PAGES.map((brand) => ({ brand: brand.id }));
}

export async function generateMetadata({ params }: PageProps<"/brands/[brand]">): Promise<Metadata> {
  const { brand: id } = await params;
  const brand = BRAND_PAGES.find((b) => b.id === id);
  return { title: brand ? `${brand.name} · Brands` : undefined };
}

/**
 * Brand page — Figma frames 1:1157 (Nike) / 1:1484 (Adidas), V1: brand
 * selector, Coming Soon chips, and every catalogue product of the brand
 * (all audiences), loaded from Supabase by BrandPageView. Figma's sample
 * products and "Trending Now" banner are not used.
 */
export default async function BrandPage({ params }: PageProps<"/brands/[brand]">) {
  const { brand: id } = await params;
  const brand = BRAND_PAGES.find((b) => b.id === id);
  if (!brand) notFound();

  return (
    <div className="pb-10">
      <SearchableHeader backHref="/" title="Brands" actions={<BagButton />} />
      <BrandPageView brandId={brand.id} brandName={brand.name} />
    </div>
  );
}
