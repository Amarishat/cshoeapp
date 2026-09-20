"use client";

import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";
import { BrandRow } from "@/components/home/BrandRow";
import { ProductRail } from "@/components/home/ProductRail";
import { SectionHeader } from "@/components/home/SectionHeader";
import { CardPlaceholder, CatalogueError } from "@/components/product/CatalogueStatus";
import { ProductCard } from "@/components/product/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getBrands, getProducts, type CatalogueProduct } from "@/lib/data/supabaseCatalog";
import { usePreferencesStore } from "@/lib/store/preferences";
import { useStoreHydrated } from "@/lib/store/useStoreHydrated";
import type { Brand } from "@/lib/types";
import { useCatalogueLoad, type CatalogueLoadState } from "@/lib/useCatalogueLoad";

/*
 * Home catalogue sections (brands and the three product sections), read from
 * Supabase in the browser. The database has no display-order column, so the
 * Home sections and their order are fixed here by product id — the same
 * lists and order as before (Figma 1:1642). Each section then shows only the
 * products for the chosen Men/Women/Kids tab; a section with none for that
 * audience is left out, and when no section has any, HomeNoProducts says so.
 */
const HOME_SECTIONS = {
  topPicks: ["nike-lite", "nike-air-force", "adidas-nmd", "puma-shuffle"],
  trending: ["air-jordan-mid", "air-jordan-low-womens", "puma-classic", "new-balance-550"],
  trendingCustomisation: ["nike-run", "adidas-run", "puma-sneakers"],
} as const;

type HomeSections = Record<keyof typeof HOME_SECTIONS, CatalogueProduct[]>;
type HomeCatalogue = { brands: Brand[]; sections: HomeSections };

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

async function loadHomeCatalogue(): Promise<HomeCatalogue> {
  const [brands, products] = await Promise.all([getBrands(), getProducts()]);
  return { brands, sections: toHomeSections(products) };
}

const CatalogueContext = createContext<{
  state: CatalogueLoadState<HomeCatalogue>;
  retry: () => void;
} | null>(null);

function useHomeCatalogue() {
  const value = useContext(CatalogueContext);
  if (!value) throw new Error("Home catalogue sections must be inside <HomeCatalogueProvider>.");
  return value;
}

const AUDIENCE_LABEL = { men: "Men", women: "Women", kids: "Kids" } as const;

/**
 * The Home sections for the chosen Men/Women/Kids tab, in Home order.
 * `sections` is null until both the catalogue and the saved choice have
 * loaded, so the rails don't flash the wrong audience's products.
 */
function useAudienceSections() {
  const { state } = useHomeCatalogue();
  const hydrated = useStoreHydrated(usePreferencesStore.persist);
  const audience = usePreferencesStore((s) => s.audience);

  if (state.status !== "ready" || !hydrated) return { state, sections: null, audience };
  const forAudience = (products: CatalogueProduct[]) => products.filter((p) => p.audience === audience);
  const { topPicks, trending, trendingCustomisation } = state.data.sections;
  return {
    state,
    sections: {
      topPicks: forAudience(topPicks),
      trending: forAudience(trending),
      trendingCustomisation: forAudience(trendingCustomisation),
    },
    audience,
  };
}

/** Loads brands and products once for all Home catalogue sections. */
export function HomeCatalogueProvider({ children }: { children: ReactNode }) {
  const { state, retry } = useCatalogueLoad(loadHomeCatalogue);
  return <CatalogueContext.Provider value={{ state, retry }}>{children}</CatalogueContext.Provider>;
}

// ---------------------------------------------------------------------------
// Loading placeholders (same footprint as the real rows)
// ---------------------------------------------------------------------------

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
        {state.status === "ready" && <BrandRow brands={state.data.brands} />}
        {state.status === "loading" && (
          <ul aria-hidden className="flex gap-[11px] overflow-hidden px-gutter">
            {Array.from({ length: 7 }, (_, i) => (
              <li key={i} className="h-[59px] w-[63px] shrink-0 animate-pulse rounded-[15px] bg-surface" />
            ))}
          </ul>
        )}
        {state.status === "error" && <CatalogueError message={state.message} onRetry={retry} />}
      </div>
    </section>
  );
}

export function HomeTopPicksSection() {
  const { state, sections } = useAudienceSections();
  if (state.status === "error") return null;
  // No top picks for the chosen audience: the section is left out.
  if (sections && sections.topPicks.length === 0) return null;

  return (
    <section aria-labelledby="home-top-picks" aria-busy={!sections} className="mt-10">
      <SectionHeader id="home-top-picks" title="Top Picks for You" viewAllHref="/shop" />
      <div className="mt-6">
        {sections ? (
          <ProductRail label="Top picks for you" gap={13} topInset={14}>
            {sections.topPicks.map((product) => (
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
  const { state, sections } = useAudienceSections();
  if (state.status === "error") return null;
  if (sections && sections.trending.length === 0) return null;

  return (
    <section aria-labelledby="home-trending" aria-busy={!sections} className="mt-10">
      <SectionHeader id="home-trending" title="Top Trending Products" />
      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 px-gutter">
        {sections
          ? sections.trending.map((product) => (
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
  const { state, sections } = useAudienceSections();
  if (state.status === "error") return null;
  if (sections && sections.trendingCustomisation.length === 0) return null;

  return (
    <section aria-labelledby="home-customisation" aria-busy={!sections} className="mt-10">
      <SectionHeader id="home-customisation" title="Top Trending Customisation" />
      <div className="mt-6">
        {sections ? (
          <ProductRail label="Top trending customisation" gap={15}>
            {sections.trendingCustomisation.map((product) => (
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

/**
 * Shown in place of the product sections when the chosen Men/Women/Kids tab
 * has no products at all (V1: Kids), in the same style as Shop's empty state.
 */
export function HomeNoProducts() {
  const { state, sections, audience } = useAudienceSections();
  if (state.status === "error" || !sections) return null;
  const empty =
    sections.topPicks.length === 0 &&
    sections.trending.length === 0 &&
    sections.trendingCustomisation.length === 0;
  if (!empty) return null;

  return (
    <div className="mt-10">
      <EmptyState icon="bag" title={`No ${AUDIENCE_LABEL[audience]} products yet`} compact />
    </div>
  );
}
