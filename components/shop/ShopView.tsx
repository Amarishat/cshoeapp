"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AudienceTabs } from "@/components/home/AudienceTabs";
import { SectionHeader } from "@/components/home/SectionHeader";
import { CardPlaceholder, CatalogueError } from "@/components/product/CatalogueStatus";
import { ProductCard } from "@/components/product/ProductCard";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { loadShopCatalogue } from "@/lib/data/shopCatalogue";
import {
  activeFilterCount,
  applyShopFilters,
  DEFAULT_AUDIENCE,
  searchProducts,
  shopSearchHref,
} from "@/lib/shopFilters";
import { usePreferencesStore } from "@/lib/store/preferences";
import { useShopFilterStore } from "@/lib/store/shopFilters";
import { useStoreHydrated } from "@/lib/store/useStoreHydrated";
import type { Audience, Brand } from "@/lib/types";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

const AUDIENCE_LABEL = { men: "Men", women: "Women", kids: "Kids" } as const;

// During a search the tabs gain "All" (the default), kept in the URL — the
// shared Men/Women/Kids preference is left untouched.
const SEARCH_AUDIENCES: { value: Audience | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "kids", label: "Kids" },
];

/**
 * Figma 1:4609: 92×35 outlined pills. Filter, Brand and Price open the Sort &
 * Filter screen (Brand/Price jump to their section) and keep the current
 * search; Filter shows how many filter categories are active. Discount has no
 * data yet, so it is Coming Soon.
 */
function FilterChips({ activeCount, href }: { activeCount: number; href: string }) {
  const setOpenedFromShop = useShopFilterStore((s) => s.setOpenedFromShop);
  const chip =
    "flex h-[35px] min-w-[92px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-border px-3 text-[17px]";
  return (
    // pt-2.5 leaves room for the Discount badge inside the scrolling row.
    <div className="no-scrollbar mt-[22px] flex gap-2.5 overflow-x-auto px-gutter pt-2.5">
      <Link
        href={href}
        onClick={() => setOpenedFromShop(true)}
        aria-label={activeCount > 0 ? `Filter, ${activeCount} active` : "Filter"}
        className={chip}
      >
        <Icon name="tune" className="size-5" />
        Filter
        {activeCount > 0 && (
          <span
            aria-hidden
            className="flex size-5 items-center justify-center rounded-full bg-ink text-[12px] font-medium text-white"
          >
            {activeCount}
          </span>
        )}
      </Link>
      <Link href={`${href}#filters-brand`} onClick={() => setOpenedFromShop(true)} className={chip}>
        Brand
      </Link>
      <Link href={`${href}#filters-price`} onClick={() => setOpenedFromShop(true)} className={chip}>
        Price
      </Link>
      <span aria-disabled="true" aria-label="Discount (coming soon)" className={cn(chip, "relative")}>
        Discount
        <ComingSoonBadge className="absolute -top-2.5 right-1" />
      </span>
    </div>
  );
}

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
  const router = useRouter();
  const hydrated = useStoreHydrated(usePreferencesStore.persist);
  const preferredAudience = usePreferencesStore((s) => s.audience);
  const filters = useShopFilterStore((s) => s.filters);
  const { state: catalogue, retry } = useCatalogueLoad(loadShopCatalogue);
  const data = catalogue.status === "ready" ? catalogue.data : null;
  const products = data?.products ?? [];

  // A search covers the whole catalogue (all audiences, and products that
  // aren't part of Shop) unless an audience tab is chosen; the normal Shop
  // shows its own products and follows the shared Men/Women/Kids choice.
  const audience = query ? searchAudience : preferredAudience;
  const shown = applyShopFilters(
    query && data ? searchProducts(data.searchable, query, data.brandNames) : products,
    audience,
    filters,
  );
  const ready = (query !== null || hydrated) && data !== null;
  // Price or brand filters can empty the grid; sort can't.
  const narrowed = filters.price !== null || filters.brands.length > 0;
  const activeCount = query
    ? Number(searchAudience !== null) + activeFilterCount(DEFAULT_AUDIENCE, filters)
    : hydrated
      ? activeFilterCount(preferredAudience, filters)
      : 0;
  const filtersHref = query
    ? `/shop/filters?${new URLSearchParams({ q: query, ...(searchAudience ? { audience: searchAudience } : {}) })}`
    : "/shop/filters";
  const countLabel = `${shown.length} ${shown.length === 1 ? "product" : "products"}`;

  return (
    <div className="pb-10">
      <div className="mt-[30px]">
        {query ? (
          <Tabs
            ariaLabel="Search results for"
            items={SEARCH_AUDIENCES}
            value={searchAudience ?? "all"}
            onValueChange={(value) =>
              router.replace(shopSearchHref(query, value === "all" ? null : value), { scroll: false })
            }
          />
        ) : (
          <AudienceTabs />
        )}
      </div>

      <FilterChips activeCount={activeCount} href={filtersHref} />

      <section aria-labelledby="shop-products" aria-busy={catalogue.status === "loading"} className="mt-10">
        {query ? (
          <div className="px-gutter">
            <div className="flex items-center gap-3">
              <h2 id="shop-products" className="min-w-0 flex-1 truncate text-body font-medium">
                Results for “{query}”
              </h2>
              <Link href="/shop" className="shrink-0 text-secondary font-medium text-ink/70">
                Clear
                <span className="sr-only"> search</span>
              </Link>
            </div>
            <p role="status" className="mt-1 text-secondary text-ink/50">
              {data && countLabel}
            </p>
          </div>
        ) : (
          <SectionHeader
            id="shop-products"
            title="All Products"
            aside={hydrated && data && <p className="text-secondary text-ink/50">{countLabel}</p>}
          />
        )}
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
                query
                  ? `No products match “${query}”`
                  : narrowed
                    ? "No products match your filters"
                    : `No ${AUDIENCE_LABEL[preferredAudience]} products yet`
              }
              compact
            />
          ))}
      </section>

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
