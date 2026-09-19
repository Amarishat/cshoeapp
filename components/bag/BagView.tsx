"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FixedBar } from "@/components/layout/FixedBar";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { loadBagCatalogue } from "@/lib/data/bagCatalogue";
import { computeBagTotals, formatAmount, formatPrice, isSelected } from "@/lib/pricing";
import { useBagStore } from "@/lib/store/bag";
import { useBagHydrated } from "@/lib/store/useBagHydrated";
import type { BagProduct } from "@/lib/types";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";
import { BagItemRow } from "./BagItemRow";

function EmptyBag() {
  return <EmptyState icon="bag" title="Your bag is empty" actionLabel="Continue Shopping" actionHref="/" />;
}

/** Note for saved Bag items whose product can't be shown (they stay saved). */
function UnavailableNote({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <p role="status" className="mt-4 px-gutter text-[15px] text-ink/50">
      {count === 1
        ? "1 item in your bag isn’t available right now and isn’t included."
        : `${count} items in your bag aren’t available right now and aren’t included.`}
    </p>
  );
}

/**
 * Bag body — Figma frame 1:2713 (everything below the header). Bag items come
 * from the bag store (kept on this device); their product info comes from
 * Supabase.
 */
export function BagView() {
  const hydrated = useBagHydrated();
  const allItems = useBagStore((s) => s.items);
  const { state, retry } = useCatalogueLoad(loadBagCatalogue);

  if (!hydrated) return <div className="flex-1" aria-busy="true" />;
  if (allItems.length === 0) return <EmptyBag />;

  if (state.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading bag" className="animate-pulse">
        <div className="mt-[30px] h-14 bg-surface" />
        <ul aria-hidden className="mt-10 flex flex-col gap-[81px] px-gutter">
          {allItems.map((item) => (
            <li key={item.id} className="flex gap-4">
              <div className="h-[120px] w-[150px] shrink-0 rounded bg-surface" />
              <div className="flex flex-1 flex-col gap-2 pt-10">
                <div className="h-5 w-3/4 rounded bg-surface" />
                <div className="h-4 w-1/2 rounded bg-surface" />
                <div className="h-5 w-2/3 rounded bg-surface" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="mt-[30px]">
        <CatalogueError message={state.message} onRetry={retry} />
      </div>
    );
  }

  return <BagContents catalog={state.data} />;
}

function BagContents({ catalog }: { catalog: Record<string, BagProduct> }) {
  const router = useRouter();
  const allItems = useBagStore((s) => s.items);
  const setQuantity = useBagStore((s) => s.setQuantity);
  const setSelected = useBagStore((s) => s.setSelected);
  const setAllSelected = useBagStore((s) => s.setAllSelected);
  const remove = useBagStore((s) => s.remove);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  // Items whose product isn't in the catalogue are not shown or priced (nothing
  // is made up for them) but stay saved; a note says so.
  const items = allItems.filter((item) => catalog[item.productId]);
  const unavailableCount = allItems.length - items.length;
  const totals = computeBagTotals(items, catalog);
  const allSelected = items.length > 0 && items.every(isSelected);
  const pendingItem = items.find((item) => item.id === pendingRemoval);

  if (items.length === 0) {
    return (
      <div>
        <UnavailableNote count={unavailableCount} />
        <EmptyBag />
      </div>
    );
  }

  return (
    <div className="pb-[calc(94px+max(env(safe-area-inset-bottom),0px)+40px)]">
      {/* Select all */}
      <div className="mt-[30px] flex h-14 items-center gap-[13px] bg-surface px-gutter text-[15px] font-medium">
        <Checkbox
          checked={allSelected}
          onChange={setAllSelected}
          label={allSelected ? "Deselect all items" : "Select all items"}
        />
        <p className="text-ink/70">
          {totals.selectedCount}/{items.length} Items Selected
        </p>
        <p>({formatPrice(totals.subtotal)})</p>
      </div>
      <UnavailableNote count={unavailableCount} />

      {/* Items */}
      <ul className="mt-10 px-gutter">
        {items.map((item, index) => (
          <BagItemRow
            key={item.id}
            // #D9D9D9 divider with 40px either side (Figma 1:2719 / 1:2804).
            className={index > 0 ? "mt-10 border-t border-[#d9d9d9] pt-10" : undefined}
            item={item}
            product={catalog[item.productId]}
            onQuantityChange={(quantity) => setQuantity(item.id, quantity)}
            onSelectedChange={(selected) => setSelected(item.id, selected)}
            onRemoveRequest={() => setPendingRemoval(item.id)}
          />
        ))}
      </ul>

      {/* Price summary */}
      <hr className="mt-10 border-border" />
      <dl className="mt-10 flex flex-col gap-4 px-gutter text-[17px]">
        {[
          ["Subtotal", totals.subtotal],
          ["Delivery", totals.delivery],
          ["Platform Fee", totals.platformFee],
        ].map(([label, amount]) => (
          <div key={label} className="flex items-center justify-between">
            <dt className="text-ink/70">{label}</dt>
            <dd>{formatAmount(amount as number)}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <dt className="font-medium">Total Amount</dt>
          <dd className="font-semibold">{formatAmount(totals.total)}</dd>
        </div>
      </dl>

      {/* Order bar */}
      <FixedBar>
        <div className="flex h-[94px] items-center justify-between bg-white pr-[22px] pl-[28px] shadow-[0_-0.5px_4px_rgba(0,0,0,0.25)] box-content pb-[env(safe-area-inset-bottom)]">
          <p className="text-body font-semibold">
            <span className="sr-only">Total </span>
            {formatPrice(totals.total)}
          </p>
          <button
            type="button"
            disabled={totals.selectedCount === 0}
            onClick={() => router.push("/checkout/address")}
            className="h-[55px] w-[222px] rounded-[30px] bg-primary text-body font-medium text-white disabled:opacity-50"
          >
            Place Order
          </button>
        </div>
      </FixedBar>

      <ConfirmDialog
        open={pendingItem !== undefined}
        title="Remove this item?"
        message={
          pendingItem
            ? `${catalog[pendingItem.productId].name}, size ${pendingItem.size.replace(/^UK /, "")}`
            : undefined
        }
        confirmLabel="Remove"
        onConfirm={() => {
          if (pendingItem) remove(pendingItem.id);
          setPendingRemoval(null);
        }}
        onCancel={() => setPendingRemoval(null)}
      />
    </div>
  );
}
