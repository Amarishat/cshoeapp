"use client";

import Image from "next/image";
import { useState } from "react";
import { SectionHeader } from "@/components/home/SectionHeader";
import { CardPlaceholder, CatalogueError } from "@/components/product/CatalogueStatus";
import { ProductCard } from "@/components/product/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { HUB_BRANDS, loadCustomiseHub } from "@/lib/data/customiseHub";
import type { Audience, Brand } from "@/lib/types";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

type HubFilter = "all" | Audience;

// "All" exists only here; Home/Shop keep their shared Men/Women/Kids preference.
const filters: { value: HubFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "kids", label: "Kids" },
];

// Multicolour ring in the Customise palette (same colours as Home's
// "Customize" banner gradient, Figma 1:409), wrapped around the circle.
const ringGradient =
  "conic-gradient(from 200deg, #ff3d00, #ffc107, #ff8bb8, #4caf50, #94a17a, #fdba62, #ff8bb8, #4b81f4, #fdba62, #ff3d00)";

/** Figma 1:3109: 69px brand circles with a gradient ring, 22px apart. Not clickable in V1. */
function BrandCircles({ brands }: { brands: Brand[] }) {
  return (
    <ul aria-label="Brands" className="no-scrollbar flex gap-[22px] overflow-x-auto px-gutter">
      {brands.map((brand) => (
        <li
          key={brand.id}
          className="flex size-[69px] shrink-0 rounded-full p-[2px]"
          style={{ backgroundImage: ringGradient }}
        >
          <span className="flex size-full items-center justify-center rounded-full bg-white">
            <Image
              src={brand.logo}
              alt={brand.name}
              width={Math.ceil(brand.logoWidth)}
              height={Math.ceil(brand.logoHeight)}
              unoptimized={brand.logo.endsWith(".svg")}
              style={{ width: brand.logoWidth, height: brand.logoHeight }}
              className="object-contain"
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Pulsing stand-in with the brand circles' footprint. */
function BrandCirclesPlaceholder() {
  return (
    <div aria-hidden className="no-scrollbar flex animate-pulse gap-[22px] overflow-x-auto px-gutter">
      {HUB_BRANDS.map((brand) => (
        <div key={brand.id} className="size-[69px] shrink-0 rounded-full bg-surface" />
      ))}
    </div>
  );
}

/**
 * Customise Hub body — Figma frame 1:3101, V1: brand circles, All/Men/Women/
 * Kids tabs and the shoes that have a working Customizer, all from Supabase.
 * Figma's spotlight carousel, highlights, photo rails and banner collage are
 * sample content and are not used.
 */
export function CustomiseHubView() {
  const { state, retry } = useCatalogueLoad(loadCustomiseHub);
  const [filter, setFilter] = useState<HubFilter>("all");
  const data = state.status === "ready" ? state.data : null;
  const products = data?.products ?? [];
  const shown = filter === "all" ? products : products.filter((p) => p.audience === filter);
  const label = filters.find((f) => f.value === filter)?.label;

  return (
    <div className="pb-10">
      {/* On an error the circles are left out; the error below says why. */}
      <div className="mt-8" aria-busy={state.status === "loading"}>
        {data ? <BrandCircles brands={data.brands} /> : state.status === "loading" && <BrandCirclesPlaceholder />}
      </div>

      <div className="mt-10">
        <Tabs ariaLabel="Customise for" items={filters} value={filter} onValueChange={setFilter} />
      </div>

      <section aria-labelledby="customise-shoes" aria-busy={state.status === "loading"} className="mt-10">
        <SectionHeader id="customise-shoes" title="Customisable Shoes" />
        {state.status === "loading" && (
          <ul aria-hidden className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 px-gutter">
            {Array.from({ length: 2 }, (_, i) => (
              <li key={i}>
                <CardPlaceholder />
              </li>
            ))}
          </ul>
        )}
        {state.status === "error" && (
          <div className="mt-6">
            <CatalogueError message={state.message} onRetry={retry} />
          </div>
        )}
        {data &&
          (shown.length > 0 ? (
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 px-gutter">
              {shown.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} action="customise" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="bag" title={`No customisable shoes for ${label} yet`} compact />
          ))}
      </section>
    </div>
  );
}
