"use client";

import { BrandSelector } from "@/components/brands/BrandSelector";
import { SectionHeader } from "@/components/home/SectionHeader";
import { CardPlaceholder, CatalogueError } from "@/components/product/CatalogueStatus";
import { ProductCard } from "@/components/product/ProductCard";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { loadBrandCatalogue } from "@/lib/data/brandCatalogue";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

// Figma 1:1302. Not built yet (no category data), so Coming Soon.
const CATEGORY_CHIPS = ["Sneakers", "Sports", "Formal", "Lifestyle", "Casual"];
const chip =
  "flex h-[35px] min-w-[92px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-border px-3 text-[17px]";

/**
 * Brand page body — Figma frames 1:1157 (Nike) / 1:1484 (Adidas), V1: brand
 * selector, Coming Soon chips, and every catalogue product of the brand (all
 * audiences), read from Supabase.
 */
export function BrandPageView({ brandId, brandName }: { brandId: string; brandName: string }) {
  const { state, retry } = useCatalogueLoad(loadBrandCatalogue);
  const data = state.status === "ready" ? state.data : null;
  const brand = data?.brands.find((b) => b.id === brandId);
  const products = data?.products.filter((p) => p.brand === brandId) ?? [];
  const missingBrand = data !== null && !brand;

  return (
    <>
      <div className="mt-[30px]">
        {data && brand ? (
          <BrandSelector brands={data.brands} selectedId={brand.id} />
        ) : (
          state.status === "loading" && (
            <ul aria-hidden className="flex gap-[11px] overflow-hidden px-gutter">
              {Array.from({ length: 7 }, (_, i) => (
                <li key={i} className="h-[59px] w-[63px] shrink-0 animate-pulse rounded-[15px] bg-surface" />
              ))}
            </ul>
          )
        )}
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

      <section aria-labelledby="brand-products" aria-busy={state.status === "loading"} className="mt-10">
        <SectionHeader
          id="brand-products"
          title={`${brand?.name ?? brandName} Products`}
          aside={
            data &&
            brand && (
              <p className="text-secondary text-ink/50">
                {products.length} {products.length === 1 ? "product" : "products"}
              </p>
            )
          }
        />
        {state.status === "loading" && (
          <ul aria-hidden className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 px-gutter">
            {Array.from({ length: 2 }, (_, i) => (
              <li key={i} className="pt-[15px]">
                <CardPlaceholder />
              </li>
            ))}
          </ul>
        )}
        {(state.status === "error" || missingBrand) && (
          <div className="mt-6">
            <CatalogueError
              message={
                state.status === "error" ? state.message : `Brand "${brandId}" is missing from the catalogue.`
              }
              onRetry={retry}
            />
          </div>
        )}
        {brand &&
          (products.length > 0 ? (
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 px-gutter">
              {products.map((product) => (
                <li key={product.id} className="pt-[15px]">
                  {/* Only products with a built product page link; others are Coming Soon. */}
                  <ProductCard product={product} linkable={product.hasProductPage} comingSoon />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="bag" title={`No ${brand.name} products yet`} compact />
          ))}
      </section>
    </>
  );
}
