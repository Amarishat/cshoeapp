import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandSelector } from "@/components/brands/BrandSelector";
import { SectionHeader } from "@/components/home/SectionHeader";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { ProductCard } from "@/components/product/ProductCard";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { getBrands } from "@/lib/data/brands";
import { getBrandProducts } from "@/lib/data/catalog";

// Only the brands in our brand data; any other slug is a 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getBrands()).map((brand) => ({ brand: brand.id }));
}

export async function generateMetadata({ params }: PageProps<"/brands/[brand]">): Promise<Metadata> {
  const { brand: id } = await params;
  const brand = (await getBrands()).find((b) => b.id === id);
  return { title: brand ? `${brand.name} · Brands` : undefined };
}

// Figma 1:1302. Not built yet (no category data), so Coming Soon.
const CATEGORY_CHIPS = ["Sneakers", "Sports", "Formal", "Lifestyle", "Casual"];
const chip =
  "flex h-[35px] min-w-[92px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-border px-3 text-[17px]";

/**
 * Brand page — Figma frames 1:1157 (Nike) / 1:1484 (Adidas), V1: brand
 * selector, Coming Soon chips, and every catalogue product of the brand
 * (all audiences). Figma's sample products and "Trending Now" banner are not
 * used.
 */
export default async function BrandPage({ params }: PageProps<"/brands/[brand]">) {
  const { brand: id } = await params;
  const brands = await getBrands();
  const brand = brands.find((b) => b.id === id);
  if (!brand) notFound();
  const { products, linkableIds } = await getBrandProducts(brand.id);

  return (
    <div className="pb-10">
      <AppHeader
        leading="back"
        backHref="/"
        title="Brands"
        actions={
          <>
            <span className="flex items-center gap-2">
              <ComingSoonBadge />
              <span role="img" aria-label="Search (coming soon)" className="flex">
                <Icon name="search" className="size-[30px] text-ink/40" />
              </span>
            </span>
            <BagButton />
          </>
        }
      />

      <div className="mt-[30px]">
        <BrandSelector brands={brands} selectedId={brand.id} />
      </div>

      <div className="mt-10">
        <div
          role="group"
          aria-label="Filter and categories (coming soon)"
          className="no-scrollbar flex gap-2.5 overflow-x-auto px-gutter"
        >
          <span aria-disabled="true" className={chip}>
            <Icon name="tune" className="size-5" />
            Filter
          </span>
          {CATEGORY_CHIPS.map((label) => (
            <span key={label} aria-disabled="true" className={chip}>
              {label}
            </span>
          ))}
        </div>
        <ComingSoonBadge className="mt-2 ml-gutter inline-block" />
      </div>

      <section aria-labelledby="brand-products" className="mt-10">
        <SectionHeader
          id="brand-products"
          title={`${brand.name} Products`}
          aside={
            <p className="text-secondary text-ink/50">
              {products.length} {products.length === 1 ? "product" : "products"}
            </p>
          }
        />
        {products.length > 0 ? (
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 px-gutter">
            {products.map((product) => (
              <li key={product.id} className="pt-[15px]">
                <ProductCard product={product} linkable={linkableIds.includes(product.id)} comingSoon />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="bag" title={`No ${brand.name} products yet`} compact />
        )}
      </section>
    </div>
  );
}
