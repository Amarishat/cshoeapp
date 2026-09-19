"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { BrandRow } from "@/components/home/BrandRow";
import { ProductRail } from "@/components/home/ProductRail";
import { SectionHeader } from "@/components/home/SectionHeader";
import { ProductCard } from "@/components/product/ProductCard";
import { getBrands, getProducts, type CatalogueProduct } from "@/lib/data/supabaseCatalog";
import type { Brand } from "@/lib/types";

/*
 * Home catalogue sections (brands and the three product sections), read from
 * Supabase in the browser. The database has no display-order column, so the
 * Home sections and their order are fixed here by product id — the same
 * lists and order as before (Figma 1:1642).
 */
const HOME_SECTIONS = {
  topPicks: ["nike-lite", "nike-air-force", "adidas-nmd", "puma-shuffle"],
  trending: ["air-jordan-mid", "air-jordan-low-womens", "puma-classic", "new-balance-550"],
  trendingCustomisation: ["nike-run", "adidas-run", "puma-sneakers"],
} as const;

type HomeSections = Record<keyof typeof HOME_SECTIONS, CatalogueProduct[]>;

type CatalogueState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; brands: Brand[]; sections: HomeSections };

/** Picks each section's products in Home order; a missing product is an error, not a gap. */
function toHomeSections(products: CatalogueProduct[]): HomeSections {
  const byId = new Map(products.map((p) => [p.id, p]));
  const pick = (ids: readonly string[]) =>
    ids.map((id) => {
      const product = byId.get(id);
      if (!product) throw new Error(`Home product "${id}" is missing from the catalogue.`);
      return product;
    });
  return {
    topPicks: pick(HOME_SECTIONS.topPicks),
    trending: pick(HOME_SECTIONS.trending),
    trendingCustomisation: pick(HOME_SECTIONS.trendingCustomisation),
  };
}

const CatalogueContext = createContext<{ state: CatalogueState; retry: () => void } | null>(null);

function useHomeCatalogue() {
  const value = useContext(CatalogueContext);
  if (!value) throw new Error("Home catalogue sections must be inside <HomeCatalogueProvider>.");
  return value;
}

/** Loads brands and products once for all Home catalogue sections. */
export function HomeCatalogueProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CatalogueState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getBrands(), getProducts()])
      .then(([brands, products]) => {
        if (!cancelled) setState({ status: "ready", brands, sections: toHomeSections(products) });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  return <CatalogueContext.Provider value={{ state, retry }}>{children}</CatalogueContext.Provider>;
}

// ---------------------------------------------------------------------------
// Loading placeholders (same footprint as the real rows)
// ---------------------------------------------------------------------------

function CardPlaceholder() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="aspect-[187/198] rounded-[20px] bg-surface" />
      <div className="mt-[11px] flex flex-col gap-2 px-[15px]">
        <div className="h-4 w-3/4 rounded bg-surface" />
        <div className="h-3.5 w-1/2 rounded bg-surface" />
        <div className="h-4 w-2/3 rounded bg-surface" />
      </div>
    </div>
  );
}

function RailPlaceholder({ count, gap, topInset }: { count: number; gap: 13 | 15; topInset?: number }) {
  return (
    <ProductRail label="Loading products" gap={gap} topInset={topInset}>
      {Array.from({ length: count }, (_, i) => (
        <CardPlaceholder key={i} />
      ))}
    </ProductRail>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/** "Brands" row. Also shows the catalogue error (once, for all sections) with a retry. */
export function HomeBrandsSection() {
  const { state, retry } = useHomeCatalogue();

  return (
    <section aria-labelledby="home-brands" aria-busy={state.status === "loading"} className="mt-10">
      <SectionHeader id="home-brands" title="Brands" />
      <div className="mt-6">
        {state.status === "ready" && <BrandRow brands={state.brands} />}
        {state.status === "loading" && (
          <ul aria-hidden className="flex gap-[11px] overflow-hidden px-gutter">
            {Array.from({ length: 7 }, (_, i) => (
              <li key={i} className="h-[59px] w-[63px] shrink-0 animate-pulse rounded-[15px] bg-surface" />
            ))}
          </ul>
        )}
        {state.status === "error" && (
          <div role="alert" className="mx-gutter rounded-[15px] bg-surface px-4 py-4">
            <p className="font-medium">Couldn’t load the catalogue.</p>
            <p className="mt-1 text-[15px] text-ink/60 [overflow-wrap:anywhere]">{state.message}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-3 h-10 rounded-full border border-border bg-white px-5 text-[15px] font-medium"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function HomeTopPicksSection() {
  const { state } = useHomeCatalogue();
  if (state.status === "error") return null;

  return (
    <section aria-labelledby="home-top-picks" aria-busy={state.status === "loading"} className="mt-10">
      <SectionHeader id="home-top-picks" title="Top Picks for You" viewAllHref="/shop" />
      <div className="mt-6">
        {state.status === "ready" ? (
          <ProductRail label="Top picks for you" gap={13} topInset={14}>
            {state.sections.topPicks.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                heartOffset="rail"
                // Only products with a built product page link; others are Coming Soon.
                linkable={product.hasProductPage}
                comingSoon
              />
            ))}
          </ProductRail>
        ) : (
          <RailPlaceholder count={HOME_SECTIONS.topPicks.length} gap={13} topInset={14} />
        )}
      </div>
    </section>
  );
}

export function HomeTrendingSection() {
  const { state } = useHomeCatalogue();
  if (state.status === "error") return null;

  return (
    <section aria-labelledby="home-trending" aria-busy={state.status === "loading"} className="mt-10">
      <SectionHeader id="home-trending" title="Top Trending Products" />
      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 px-gutter">
        {state.status === "ready"
          ? state.sections.trending.map((product) => (
              <li key={product.id} className="pt-[15px]">
                <ProductCard product={product} linkable={product.hasProductPage} comingSoon />
              </li>
            ))
          : HOME_SECTIONS.trending.map((id) => (
              <li key={id} className="pt-[15px]">
                <CardPlaceholder />
              </li>
            ))}
      </ul>
      <div className="mt-6 flex justify-center">
        <Link
          href="/shop"
          className="flex h-11 w-[110px] items-center justify-center rounded-[33.5px] border border-border bg-white text-label font-medium"
        >
          View All
        </Link>
      </div>
    </section>
  );
}

export function HomeCustomisationSection() {
  const { state } = useHomeCatalogue();
  if (state.status === "error") return null;

  return (
    <section aria-labelledby="home-customisation" aria-busy={state.status === "loading"} className="mt-10">
      <SectionHeader id="home-customisation" title="Top Trending Customisation" />
      <div className="mt-6">
        {state.status === "ready" ? (
          <ProductRail label="Top trending customisation" gap={15}>
            {state.sections.trendingCustomisation.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                action="customise"
                categoryOpacity={50}
                // Only products with a built Customizer link; others are Coming Soon.
                linkable={product.customizable}
              />
            ))}
          </ProductRail>
        ) : (
          <RailPlaceholder count={HOME_SECTIONS.trendingCustomisation.length} gap={15} />
        )}
      </div>
    </section>
  );
}
