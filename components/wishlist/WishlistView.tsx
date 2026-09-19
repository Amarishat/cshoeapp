"use client";

import { Fragment, useState } from "react";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import type { CatalogProduct } from "@/lib/data/catalog";
import { useStoreHydrated } from "@/lib/store/useStoreHydrated";
import { useWishlistStore } from "@/lib/store/wishlist";
import { WishlistCard } from "./WishlistCard";

/**
 * Wishlist body — Figma frame 1:5946 (below the header). Items come only from
 * the wishlist store; Figma's MRP/discount, sample products and Recently
 * Viewed rail are not used in V1.
 */
export function WishlistView({ catalog }: { catalog: Record<string, CatalogProduct> }) {
  const hydrated = useStoreHydrated(useWishlistStore.persist);
  const productIds = useWishlistStore((s) => s.productIds);
  const remove = useWishlistStore((s) => s.remove);
  const [pending, setPending] = useState<CatalogProduct | null>(null);

  // Ids that no longer resolve to a product are skipped.
  const items = productIds.map((id) => catalog[id]).filter((p): p is CatalogProduct => !!p);

  if (!hydrated) return null;
  if (items.length === 0) {
    return (
      <EmptyState icon="heart" title="Your wishlist is empty" actionLabel="Continue Shopping" actionHref="/" />
    );
  }

  return (
    <div className="pb-10">
      {/* Figma 1:5956: count, share and filter between two #CCC 70% lines */}
      <div className="mt-[30px] flex h-[62px] items-center justify-between border-y border-border/70 pr-gutter pl-gutter">
        <p className="text-[17px] text-ink/50">
          {items.length} {items.length === 1 ? "item" : "items"}
        </p>
        <div role="group" aria-label="Share and filter — coming soon" className="flex items-center gap-2">
          <ComingSoonBadge />
          <span role="img" aria-label="Share wishlist (coming soon)" className="flex">
            <Icon name="shareOutline" className="size-[30px] text-ink/40" />
          </span>
          <span role="img" aria-label="Filter wishlist (coming soon)" className="ml-[22px] flex">
            <Icon name="tune" className="size-[30px] text-ink/40" />
          </span>
        </div>
      </div>

      <ul aria-label="Wishlist" className="mt-10">
        {items.map((product, i) => (
          <Fragment key={product.id}>
            {i > 0 && (
              // Figma 1:6012: inset #CCC 70% divider, 40px above and below
              <li aria-hidden className="mx-[30px] my-10 border-t border-border/70" />
            )}
            <li>
              <WishlistCard product={product} onRemove={() => setPending(product)} />
            </li>
          </Fragment>
        ))}
      </ul>

      <ConfirmDialog
        open={pending !== null}
        title="Remove from wishlist?"
        message={pending ? `${pending.name} will be removed from your wishlist.` : undefined}
        confirmLabel="Remove"
        onConfirm={() => {
          if (pending) remove(pending.id);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
