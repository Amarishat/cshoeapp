"use client";

import { Fragment, useState } from "react";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { loadWishlistCatalogue } from "@/lib/data/wishlistCatalogue";
import { useWishlistStore } from "@/lib/store/wishlist";
import type { CatalogProduct } from "@/lib/types";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";
import { WishlistCard } from "./WishlistCard";

/** Pulsing stand-in with the wishlist rows' footprint. */
function RowsPlaceholder({ keys }: { keys: string[] }) {
  return (
    <div aria-busy="true" aria-label="Loading wishlist" className="pb-10">
      <div className="mt-[30px] h-[62px] border-y border-border/70" />
      <ul aria-hidden className="mt-10 flex animate-pulse flex-col gap-[81px]">
        {keys.map((key) => (
          <li key={key} className="flex gap-5 pr-[13px] pl-gutter">
            <div className="aspect-[170/120] w-[43%] max-w-[170px] shrink-0 rounded-[11px] bg-surface" />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <div className="h-5 w-3/4 rounded bg-surface" />
              <div className="h-4 w-1/2 rounded bg-surface" />
              <div className="h-4 w-1/3 rounded bg-surface" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Wishlist body — Figma frame 1:5946 (below the header). Saved products come
 * from Supabase (public.wishlist_items) and their product info from the
 * catalogue. Figma's MRP/discount, sample products and Recently Viewed rail
 * are not used in V1.
 */
export function WishlistView() {
  const status = useWishlistStore((s) => s.status);
  const loadError = useWishlistStore((s) => s.loadError);
  const retryWishlist = useWishlistStore((s) => s.retry);
  const productIds = useWishlistStore((s) => s.productIds);
  const remove = useWishlistStore((s) => s.remove);
  const [pending, setPending] = useState<CatalogProduct | null>(null);
  const [removeError, setRemoveError] = useState("");
  const { state, retry } = useCatalogueLoad(loadWishlistCatalogue);

  // The saved products themselves are loaded from Supabase.
  if (status === "idle" || status === "loading") return <RowsPlaceholder keys={["a", "b"]} />;
  if (status === "error") {
    return (
      <div className="mt-[30px]">
        <CatalogueError
          title="Couldn’t load your wishlist."
          message={loadError ?? ""}
          // The product info is loaded separately and has usually failed too.
          onRetry={() => {
            retry();
            void retryWishlist();
          }}
        />
      </div>
    );
  }
  if (productIds.length === 0) {
    return (
      <EmptyState icon="heart" title="Your wishlist is empty" actionLabel="Continue Shopping" actionHref="/" />
    );
  }

  if (state.status === "loading") return <RowsPlaceholder keys={productIds} />;
  if (state.status === "error") {
    return (
      <div className="mt-[30px]">
        <CatalogueError message={state.message} onRetry={retry} />
      </div>
    );
  }

  // Saved ids keep their order. Ids missing from the catalogue are not shown
  // (nothing is made up for them) but stay saved; a note says so.
  const catalog = state.data;
  const items = productIds.map((id) => catalog[id]).filter((p): p is CatalogProduct => !!p);
  const missingCount = productIds.length - items.length;
  const missingNote =
    missingCount > 0 ? (
      <p role="status" className="mt-4 px-gutter text-[15px] text-ink/50">
        {missingCount === 1
          ? "1 saved item isn’t in the catalogue right now."
          : `${missingCount} saved items aren’t in the catalogue right now.`}
      </p>
    ) : null;

  if (items.length === 0) {
    return (
      <div>
        {missingNote}
        <EmptyState icon="heart" title="Your wishlist is empty" actionLabel="Continue Shopping" actionHref="/" />
      </div>
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
      {missingNote}
      {removeError && (
        <p role="alert" className="mt-4 px-gutter text-[15px] text-danger [overflow-wrap:anywhere]">
          {removeError}
        </p>
      )}

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
          // Removed from Supabase first; the row stays until that succeeds.
          if (pending) {
            setRemoveError("");
            void remove(pending.id).then((error) => setRemoveError(error ?? ""));
          }
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
