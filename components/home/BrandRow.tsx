import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@/lib/types";

/** Horizontally scrolling 63×59 brand tiles (Figma 1:1785): #F5F5F5, 15px radius, 11px gaps. */
export function BrandRow({ brands }: { brands: Brand[] }) {
  return (
    <ul className="no-scrollbar flex snap-x snap-mandatory scroll-px-gutter gap-[11px] overflow-x-auto px-gutter">
      {brands.map((brand) => (
        <li key={brand.id} className="shrink-0 snap-start">
          <Link
            href={`/brands/${brand.id}`}
            aria-label={brand.name}
            className="flex h-[59px] w-[63px] items-center justify-center rounded-[15px] bg-surface"
          >
            <Image
              src={brand.logo}
              alt=""
              width={Math.ceil(brand.logoWidth)}
              height={Math.ceil(brand.logoHeight)}
              unoptimized={brand.logo.endsWith(".svg")}
              style={{ width: brand.logoWidth, height: brand.logoHeight }}
              className="object-cover"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
