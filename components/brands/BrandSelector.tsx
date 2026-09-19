"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Brand } from "@/lib/types";

function Logo({ brand, white = false }: { brand: Brand; white?: boolean }) {
  return (
    <Image
      src={brand.logo}
      alt=""
      width={Math.ceil(brand.logoWidth)}
      height={Math.ceil(brand.logoHeight)}
      unoptimized={brand.logo.endsWith(".svg")}
      // The selected pill shows the same logo in white.
      style={{
        width: brand.logoWidth,
        height: brand.logoHeight,
        filter: white ? "brightness(0) invert(1)" : undefined,
      }}
      className="shrink-0 object-contain"
    />
  );
}

/**
 * Brand selector (Figma 1:1161): scrolls sideways. The current brand is a
 * #1A1A1A pill with white logo and name; the others are 63×59 #F5F5F5 tiles
 * that link to their brand page. The current brand is scrolled into view.
 */
export function BrandSelector({ brands, selectedId }: { brands: Brand[]; selectedId: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const selectedRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const item = selectedRef.current;
    if (!list || !item) return;
    // Scroll only the row (never the page) so the pill sits at the left gutter.
    list.scrollLeft = item.offsetLeft - list.offsetLeft - 20;
  }, [selectedId]);

  return (
    <ul ref={listRef} aria-label="Brands" className="no-scrollbar flex gap-[11px] overflow-x-auto px-gutter">
      {brands.map((brand) =>
        brand.id === selectedId ? (
          <li key={brand.id} ref={selectedRef} className="shrink-0">
            <span
              aria-current="page"
              className="flex h-[59px] items-center gap-2.5 rounded-[15px] bg-[#1a1a1a] px-5 text-[18px] font-semibold whitespace-nowrap text-white"
            >
              <Logo brand={brand} white />
              {brand.name}
            </span>
          </li>
        ) : (
          <li key={brand.id} className="shrink-0">
            <Link
              href={`/brands/${brand.id}`}
              aria-label={brand.name}
              className="flex h-[59px] w-[63px] items-center justify-center rounded-[15px] bg-surface"
            >
              <Logo brand={brand} />
            </Link>
          </li>
        ),
      )}
    </ul>
  );
}
