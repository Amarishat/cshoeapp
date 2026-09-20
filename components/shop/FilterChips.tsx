"use client";

import Link from "next/link";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useShopFilterStore } from "@/lib/store/shopFilters";

/**
 * Figma 1:4609: 92×35 outlined pills. Filter, Brand and Price open the Sort &
 * Filter screen (Brand/Price jump to their section) and keep the current
 * search; Filter shows how many filter categories are active. Discount has no
 * data yet, so it is Coming Soon. Used by Shop and by search results.
 */
export function FilterChips({ activeCount, href }: { activeCount: number; href: string }) {
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
