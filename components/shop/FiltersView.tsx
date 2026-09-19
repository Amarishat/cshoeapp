"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { FixedBar } from "@/components/layout/FixedBar";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { formatGrouped } from "@/lib/pricing";
import {
  DEFAULT_AUDIENCE,
  matchShopFilters,
  searchProducts,
  shopSearchHref,
  SORT_OPTIONS,
  type ShopFilters,
  type ShopSort,
} from "@/lib/shopFilters";
import { usePreferencesStore } from "@/lib/store/preferences";
import { useShopFilterStore } from "@/lib/store/shopFilters";
import type { Audience, Brand, Product } from "@/lib/types";

const AUDIENCES: { value: Audience | "all"; label: string }[] = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "kids", label: "Kids" },
];
// During a Shop search the tabs also offer "All" (the search default).
const SEARCH_AUDIENCES: { value: Audience | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...AUDIENCES,
];

const sectionTitle = "px-gutter text-body font-medium";

/** Figma 1:5769 radio: 19px circle, #CCC outline; selected adds a black ring and dot. */
function SortOptions({ value, onChange }: { value: ShopSort | null; onChange: (v: ShopSort) => void }) {
  return (
    <div role="radiogroup" aria-labelledby="filters-sort" className="mt-6 flex flex-col gap-5 px-gutter">
      {SORT_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className="flex items-center gap-3 self-start text-base"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-[19px] items-center justify-center rounded-full border bg-white",
                selected ? "border-ink" : "border-border",
              )}
            >
              {selected && <span className="size-[9px] rounded-full bg-ink" />}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Sort & Filter — Figma frame 1:5769, V1. Only filters our catalogue supports:
 * audience, price sort, price range and brand (Brand is an addition to
 * Figma). Changes are a draft until Apply, which saves them for this browsing
 * session and returns to Shop. The count updates live.
 */
export function FiltersView({
  products,
  brands,
  bounds,
  brandNames,
  query,
  searchAudience,
}: {
  products: Product[];
  brands: Brand[];
  bounds: [number, number];
  /** Brand id → name, for text search. */
  brandNames: Record<string, string>;
  /** The Shop search being filtered (`?q=`), if any. */
  query: string | null;
  /** The search's audience (`?audience=`); `null` = all. */
  searchAudience: Audience | null;
}) {
  const router = useRouter();
  const applied = useShopFilterStore((s) => s.filters);
  const applyFilters = useShopFilterStore((s) => s.apply);
  const openedFromShop = useShopFilterStore((s) => s.openedFromShop);
  const setOpenedFromShop = useShopFilterStore((s) => s.setOpenedFromShop);
  const shopAudience = usePreferencesStore((s) => s.audience);
  const setAudience = usePreferencesStore((s) => s.setAudience);

  // Drafts start from the applied state. Normal Shop: audience follows the
  // shared preference until changed here. Search: it starts from the URL (All
  // by default) and never touches the shared preference.
  const [draftAudience, setDraftAudience] = useState<Audience | "all" | null>(
    query ? (searchAudience ?? "all") : null,
  );
  const [sort, setSort] = useState<ShopSort | null>(applied.sort);
  const [price, setPrice] = useState<[number, number]>(applied.price ?? bounds);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(applied.brands);

  const audience = draftAudience ?? shopAudience;
  const countAudience = audience === "all" ? null : audience;
  const candidates = query ? searchProducts(products, query, brandNames) : products;
  const draft: ShopFilters = {
    sort,
    price: price[0] === bounds[0] && price[1] === bounds[1] ? null : price,
    brands: selectedBrands,
  };
  const count = matchShopFilters(candidates, countAudience, draft).length;

  function toggleBrand(id: string) {
    setSelectedBrands((ids) => (ids.includes(id) ? ids.filter((b) => b !== id) : [...ids, id]));
  }

  function clearAll() {
    setDraftAudience(query ? "all" : DEFAULT_AUDIENCE);
    setSort(null);
    setPrice(bounds);
    setSelectedBrands([]);
  }

  function apply() {
    applyFilters(draft);
    if (query) {
      // Back to the same search, with the chosen audience in the URL.
      setOpenedFromShop(false);
      router.replace(shopSearchHref(query, countAudience));
      return;
    }
    if (countAudience) setAudience(countAudience);
    if (openedFromShop) {
      setOpenedFromShop(false);
      router.back();
    } else {
      router.replace("/shop");
    }
  }

  return (
    <div className="pb-[calc(110px+env(safe-area-inset-bottom)+32px)]">
      <AppHeader
        leading="back"
        backHref="/shop"
        title="Filters"
        actions={
          <button type="button" onClick={clearAll} className="text-[17px] whitespace-nowrap">
            Clear Filters
          </button>
        }
      />

      {/* Figma 1:5924: full-width #CCC line under the header */}
      <hr className="mt-[30px] border-border" />
      <div className="mt-[23px]">
        <Tabs
          ariaLabel="Shop for"
          items={query ? SEARCH_AUDIENCES : AUDIENCES}
          value={audience}
          onValueChange={setDraftAudience}
        />
      </div>

      <section aria-labelledby="filters-sort" className="mt-10">
        <h2 id="filters-sort" className={sectionTitle}>
          Sort by
        </h2>
        <SortOptions value={sort} onChange={setSort} />
      </section>

      <section id="filters-price" aria-label="Price range" className="mt-10 px-gutter">
        <div className="mx-auto w-full max-w-[300px]">
          <RangeSlider
            min={bounds[0]}
            max={bounds[1]}
            value={price}
            onChange={setPrice}
            labels={["Minimum price", "Maximum price"]}
            formatValue={formatGrouped}
          />
        </div>
      </section>

      <hr className="mt-14 border-border" />

      {/* Brand: not in Figma; added because the catalogue has brand data. */}
      <section aria-labelledby="filters-brand" className="mt-10">
        <h2 id="filters-brand" className={sectionTitle}>
          Brand
        </h2>
        <div role="group" aria-labelledby="filters-brand" className="mt-6 flex flex-wrap gap-x-2.5 gap-y-5 px-gutter">
          {brands.map((brand) => {
            const selected = selectedBrands.includes(brand.id);
            return (
              <button
                key={brand.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleBrand(brand.id)}
                className={cn(
                  "h-[37px] border bg-white px-2.5 text-base",
                  selected ? "border-ink text-ink" : "border-border text-ink/80",
                )}
              >
                {brand.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Figma 1:5938: fixed white bar with the live count and orange Apply. */}
      <FixedBar>
        <div className="box-content flex h-[110px] items-start justify-between border-t border-border bg-white pt-0 pr-[19px] pb-[env(safe-area-inset-bottom)] pl-[25px]">
          <p role="status" className="mt-[25px] flex flex-col font-medium">
            <span className="text-body">{count}</span>
            <span className="text-[17px] text-ink/50">{count === 1 ? "Product Found" : "Products Found"}</span>
          </p>
          <button
            type="button"
            onClick={apply}
            className="mt-[21px] h-[45px] w-[108px] rounded-[6px] bg-action text-body font-medium text-white"
          >
            Apply
          </button>
        </div>
      </FixedBar>
    </div>
  );
}
