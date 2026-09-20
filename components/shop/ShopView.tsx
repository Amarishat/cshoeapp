"use client";

import Image from "next/image";
import { AudienceTabs } from "@/components/home/AudienceTabs";
import { SectionHeader } from "@/components/home/SectionHeader";
import { CardPlaceholder, CatalogueError } from "@/components/product/CatalogueStatus";
import { ProductCard } from "@/components/product/ProductCard";
import { FilterChips } from "@/components/shop/FilterChips";
import { SearchResults } from "@/components/shop/SearchResults";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { loadShopCatalogue } from "@/lib/data/shopCatalogue";
import { activeFilterCount, applyShopFilters } from "@/lib/shopFilters";
import { usePreferencesStore } from "@/lib/store/preferences";
import { useShopFilterStore } from "@/lib/store/shopFilters";
import { useStoreHydrated } from "@/lib/store/useStoreHydrated";
import type { Audience, Brand } from "@/lib/types";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

const AUDIENCE_LABEL = { men: "Men", women: "Women", kids: "Kids" } as const;

/** Figma "Shop by Brands": 3 columns with #CCC dividers between cells. Not clickable in V1. */
function BrandGrid({ brands }: { brands: Brand[] }) {
  const lastRowStart = brands.length - (brands.length % 3 || 3);
  return (
    <ul className="mx-[25px] grid grid-cols-3">
      {brands.map((brand, i) => (
        <li
          key={brand.id}
          className={cn(
            "flex h-[98px] items-center justify-center border-border",
            i % 3 !== 2 && "border-r",
            i < lastRowStart && "border-b",
          )}
        >
          {/* Logos at 1.6× their Home tile size, close to Figma's logo sizes. */}
          <Image
            src={brand.logo}
            alt={brand.name}
            width={Math.ceil(brand.logoWidth * 1.6)}
            height={Math.ceil(brand.logoHeight * 1.6)}
            unoptimized={brand.logo.endsWith(".svg")}
            style={{ width: brand.logoWidth * 1.6, height: brand.logoHeight * 1.6 }}
            className="object-contain"
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Shop body — Figma frame 1:4596, V1: audience tabs, filter chips (Filter
 * opens /shop/filters), the catalogue for the chosen audience with the applied
 * filters and sort, and Shop by Brands. With `?q=` it shows search results
 * (all audiences unless a tab is chosen) combined with the same filters. Figma's Highlights, New Arrivals,
 * Bestsellers and Recently Viewed are not used. Products and brands come
 * from Supabase (loading and error states in the product section).
 */
export function ShopView({
  query,
  searchAudience,
}: {
  /** `?q=` — when set, Shop shows search results. */
  query: string | null;
  /** `?audience=` during a search; `null` = all audiences. */
  searchAudience: Audience | null;
}) {
  const hydrated = useStoreHydrated(usePreferencesStore.persist);
  const preferredAudience = usePreferencesStore((s) => s.audience);
  const filters = useShopFilterStore((s) => s.filters);
  const { state: catalogue, retry } = useCatalogueLoad(loadShopCatalogue);
  const data = catalogue.status === "ready" ? catalogue.data : null;
  const products = data?.products ?? [];

  // Shop shows its own products for the shared Men/Women/Kids choice; a
  // search (`?q=`) shows the shared search results instead, above Shop by
  // Brands.
  const shown = applyShopFilters(products, preferredAudience, filters);
  const ready = hydrated && data !== null;
  // Price or brand filters can empty the grid; sort can't.
  const narrowed = filters.price !== null || filters.brands.length > 0;
  const activeCount = hydrated ? activeFilterCount(preferredAudience, filters) : 0;
  const countLabel = `${shown.length} ${shown.length === 1 ? "product" : "products"}`;

  return (
    <div className="pb-10">
      {query !== null ? (
        <SearchResults query={query} searchAudience={searchAudience} basePath="/shop" />
      ) : (
        <>
          <div className="mt-[30px]">
            <AudienceTabs />
          </div>

          <FilterChips activeCount={activeCount} href="/shop/filters" />

          <section aria-labelledby="shop-products" aria-busy={catalogue.status === "loading"} className="mt-10">
            <SectionHeader
              id="shop-products"
              title="All Products"
              aside={hydrated && data && <p className="text-secondary text-ink/50">{countLabel}</p>}
            />
            {catalogue.status === "loading" && (
              <ul aria-hidden className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 px-gutter">
                {Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="pt-[15px]">
                    <CardPlaceholder />
                  </li>
                ))}
              </ul>
            )}
            {catalogue.status === "error" && (
              <div className="mt-6">
                <CatalogueError message={catalogue.message} onRetry={retry} />
              </div>
            )}
            {/* Wait for the saved Men/Women/Kids choice so the grid doesn't flash. */}
            {ready &&
              (shown.length > 0 ? (
                <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 px-gutter">
                  {shown.map((product) => (
                    <li key={product.id} className="pt-[15px]">
                      {/* Only products with a built product page link; others are Coming Soon. */}
                      <ProductCard product={product} linkable={product.hasProductPage} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon="bag"
                  title={
                    narrowed
                      ? "No products match your filters"
                      : `No ${AUDIENCE_LABEL[preferredAudience]} products yet`
                  }
                  compact
                />
              ))}
          </section>
        </>
      )}

      {data && (
        <section aria-labelledby="shop-brands" className="mt-10">
          <SectionHeader id="shop-brands" title="Shop by Brands" />
          <div className="mt-7">
            <BrandGrid brands={data.brands} />
          </div>
        </section>
      )}
    </div>
  );
}
