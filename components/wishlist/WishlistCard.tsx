"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { FittedCardImage } from "@/components/product/CardImage";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/pricing";
import type { CatalogProduct } from "@/lib/types";

/** Three-dot button with a one-item menu: "Remove". */
function MoreMenu({ productName, onRemove }: { productName: string; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    itemRef.current?.focus();
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === "Tab") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative -mt-0.5 -mr-1 shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`More options for ${productName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex p-1"
      >
        <Image src="/images/wishlist/more.svg" alt="" width={18} height={19} unoptimized />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Options for ${productName}`}
          className="absolute top-full right-0 z-20 mt-1 min-w-[140px] rounded-[11px] border border-border/70 bg-white py-1 shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
        >
          <button
            ref={itemRef}
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
            className="w-full px-4 py-2.5 text-left text-[17px] text-danger"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Wishlist row — Figma 1:5968: 170×120 #F5F5F5 tile, then name, category,
 * selling price, add-to-bag and Buy Now. Cards without a built product page
 * are not links, and their actions are Coming Soon (a size must be chosen on
 * the product page, so nothing is added to the bag from here).
 */
export function WishlistCard({
  product,
  onRemove,
}: {
  product: CatalogProduct;
  onRemove: () => void;
}) {
  const { href } = product;
  const tile = (
    <div className="relative aspect-[170/120] rounded-[11px] bg-surface">
      {/* Figma image frame: 152×86 at (10, 25) in the 170×120 tile */}
      <div className="absolute top-[20.8%] right-[4.7%] bottom-[7.5%] left-[5.9%]">
        <FittedCardImage image={product.image} alt={product.name} shadow="0 3px 2px rgba(0,0,0,0.25)" />
      </div>
    </div>
  );
  const bagIcon = <Image src="/images/wishlist/bag-add.svg" alt="" width={16} height={19} unoptimized />;
  const addClass = "flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-border bg-white";
  const buyClass =
    "relative flex h-9 max-w-[139px] min-w-0 flex-1 items-center justify-center rounded-[18px] bg-[#1a1a1a] text-[17px] font-medium whitespace-nowrap text-white";

  return (
    <article className="flex gap-5 pr-[13px] pl-gutter">
      <div className="w-[43%] max-w-[170px] shrink-0">
        {href ? (
          // Duplicate of the name link, so hidden from keyboard/screen readers.
          <Link href={href} tabIndex={-1} aria-hidden className="block">
            {tile}
          </Link>
        ) : (
          tile
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <h2 className="min-w-0 flex-1 text-body font-medium">
            {href ? (
              <Link href={href} className="line-clamp-2">
                {product.name}
              </Link>
            ) : (
              <span className="line-clamp-2">{product.name}</span>
            )}
          </h2>
          <MoreMenu productName={product.name} onRemove={onRemove} />
        </div>
        <p className="mt-0.5 truncate text-[16px] text-ink/30">{product.category}</p>
        <p className="mt-[7px] text-[15px] font-semibold">{formatPrice(product.price)}</p>

        <div className="mt-auto flex max-w-[181px] gap-1.5 pt-3">
          {href ? (
            <>
              <Link href={href} aria-label={`Add ${product.name} to bag — choose a size`} className={addClass}>
                {bagIcon}
              </Link>
              <Link href={href} aria-label={`Buy ${product.name} now — choose a size`} className={buyClass}>
                Buy Now
              </Link>
            </>
          ) : (
            <>
              <span aria-disabled="true" className={cn(addClass, "opacity-40")}>
                {bagIcon}
                <span className="sr-only">Add to bag (coming soon)</span>
              </span>
              <span aria-disabled="true" className={buyClass}>
                <span className="opacity-60">Buy Now</span>
                <ComingSoonBadge className="absolute -top-2.5 right-2" />
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
