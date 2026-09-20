"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardPlaceholder, CatalogueError } from "@/components/product/CatalogueStatus";
import { ProductCard } from "@/components/product/ProductCard";
import { FilterChips } from "@/components/shop/FilterChips";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { loadShopCatalogue } from "@/lib/data/shopCatalogue";
import {
  activeFilterCount,
  applyShopFilters,
  DEFAULT_AUDIENCE,
  searchProducts,
  shopSearchHref,
  type SearchBasePath,
} from "@/lib/shopFilters";
import { useShopFilterStore } from "@/lib/store/shopFilters";
import type { Audience } from "@/lib/types";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

/** Whose products a search was narrowed to ("No Men’s products match …"). */
const SEARCH_AUDIENCE_LABEL = { men: "Men’s", women: "Women’s", kids: "Kids" } as const;

// A search has its own tabs, with "All" (the default) — the shared
// Men/Women/Kids preference is left untouched while searching.
const SEARCH_AUDIENCES: { value: Audience | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "kids", label: "Kids" },
];

/**
 * Search results — the audience tabs, filter chips, "Results for …" heading
 * with the count and Clear, and the product grid. Shown by Shop (`/shop?q=`)
 * and by Home (`/?q=`); `basePath` is where this search lives, so the tabs,
 * Clear and the Sort & Filter screen all come back to the right screen.
 *
 * Search matching and filtering are the shared ones (searchProducts,
 * applyShopFilters) over the Shop catalogue.
 */
export function SearchResults({
  query,
  searchAudience,
  basePath,
}: {
  /** The search being shown (`?q=`). */
  query: string;
  /** `?audience=`; `null` = all audiences. */
  searchAudience: Audience | null;
  /** The screen this search belongs to: "/" (Home) or "/shop". */
  basePath: SearchBasePath;
}) {
  const router = useRouter();
  const filters = useShopFilterStore((s) => s.filters);
  const { state: catalogue, retry } = useCatalogueLoad(loadShopCatalogue);
  const data = catalogue.status === "ready" ? catalogue.data : null;

  // A search covers the whole catalogue (all audiences, and products that
  // aren't part of Shop) unless an audience tab is chosen.
  const shown = data
    ? applyShopFilters(searchProducts(data.searchable, query, data.brandNames), searchAudience, filters)
    : [];
  const activeCount = Number(searchAudience !== null) + activeFilterCount(DEFAULT_AUDIENCE, filters);
  const filtersHref = `/shop/filters?${new URLSearchParams({
    q: query,
    ...(searchAudience ? { audience: searchAudience } : {}),
    ...(basePath === "/shop" ? {} : { from: basePath }),
  })}`;
  const countLabel = `${shown.length} ${shown.length === 1 ? "product" : "products"}`;

  return (
    <>
      <div className="mt-[30px]">
        <Tabs
          ariaLabel="Search results for"
          items={SEARCH_AUDIENCES}
          value={searchAudience ?? "all"}
          onValueChange={(value) =>
            router.replace(shopSearchHref(query, value === "all" ? null : value, basePath), {
              scroll: false,
            })
          }
        />
      </div>

      <FilterChips activeCount={activeCount} href={filtersHref} />

      <section aria-labelledby="search-results" aria-busy={catalogue.status === "loading"} className="mt-10">
        <div className="px-gutter">
          <div className="flex items-center gap-3">
            <h2 id="search-results" className="min-w-0 flex-1 truncate text-body font-medium">
              Results for “{query}”
            </h2>
            <Link href={basePath} className="shrink-0 text-secondary font-medium text-ink/70">
              Clear
              <span className="sr-only"> search</span>
            </Link>
          </div>
          <p role="status" className="mt-1 text-secondary text-ink/50">
            {data && countLabel}
          </p>
        </div>
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
        {data &&
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
                // An audience tab can empty a search that does have matches.
                searchAudience
                  ? `No ${SEARCH_AUDIENCE_LABEL[searchAudience]} products match “${query}”`
                  : `No products match “${query}”`
              }
              compact
            />
          ))}
      </section>
    </>
  );
}
