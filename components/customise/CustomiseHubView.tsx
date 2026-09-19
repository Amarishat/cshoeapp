"use client";

import Image from "next/image";
import { useState } from "react";
import { SectionHeader } from "@/components/home/SectionHeader";
import { ProductCard } from "@/components/product/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import type { Audience, Brand, Product } from "@/lib/types";

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

/**
 * Customise Hub body — Figma frame 1:3101, V1: brand circles, All/Men/Women/
 * Kids tabs and the shoes that have a working Customizer. Figma's spotlight
 * carousel, highlights, photo rails and banner collage are sample content and
 * are not used.
 */
export function CustomiseHubView({ products, brands }: { products: Product[]; brands: Brand[] }) {
  const [filter, setFilter] = useState<HubFilter>("all");
  const shown = filter === "all" ? products : products.filter((p) => p.audience === filter);
  const label = filters.find((f) => f.value === filter)?.label;

  return (
    <div className="pb-10">
      <div className="mt-8">
        <BrandCircles brands={brands} />
      </div>

      <div className="mt-10">
        <Tabs ariaLabel="Customise for" items={filters} value={filter} onValueChange={setFilter} />
      </div>

      <section aria-labelledby="customise-shoes" className="mt-10">
        <SectionHeader id="customise-shoes" title="Customisable Shoes" />
        {shown.length > 0 ? (
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 px-gutter">
            {shown.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} action="customise" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="bag" title={`No customisable shoes for ${label} yet`} compact />
        )}
      </section>
    </div>
  );
}
