"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { selectBagCount, useBagStore } from "@/lib/store/bag";

/** Header bag icon with the item count drawn inside it (Figma f7:bag + Inter Bold 12). */
export function BagButton() {
  const count = useBagStore(selectBagCount);

  return (
    <Link
      href="/bag"
      aria-label={count > 0 ? `Bag, ${count} ${count === 1 ? "item" : "items"}` : "Bag"}
      className="relative -m-[7px] flex p-[7px]"
    >
      <Icon name="bag" className="size-[30px]" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-[17px] text-center text-caption leading-[15px] font-bold"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
