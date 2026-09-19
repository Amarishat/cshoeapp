"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FixedBar } from "@/components/layout/FixedBar";
import { BagActionError } from "@/components/bag/BagActionError";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { loadBagCatalogue } from "@/lib/data/bagCatalogue";
import { listAddresses } from "@/lib/data/userAddresses";
import { computeBagTotals, formatAmount, formatNumber, isSelected } from "@/lib/pricing";
import { useBagStore } from "@/lib/store/bag";
import { useCheckoutStore } from "@/lib/store/checkout";
import { useStoreHydrated } from "@/lib/store/useStoreHydrated";
import type { Address, BagProduct } from "@/lib/types";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";
import { isValidAddress } from "@/lib/validation/address";
import { CheckoutStepper } from "./CheckoutStepper";
import { DeliverToCard } from "./DeliverToCard";
import { OrderItemRow } from "./OrderItemRow";

/** Products (the Bag's catalogue) and the guest's saved addresses, from Supabase. */
async function loadOrderSummary() {
  const [catalog, addresses] = await Promise.all([loadBagCatalogue(), listAddresses()]);
  return { catalog, addresses };
}

/**
 * Checkout step 2 — Figma frame 1:3495 (everything below the header).
 * V1 leaves out Figma's current-location, CS Coins and gift sections and its
 * sample prices; totals come from the same computeBagTotals as the Bag.
 * Products and the delivery address come from Supabase; the selected address
 * id and the Bag items come from the device's checkout / bag stores.
 */
export function OrderSummaryView() {
  const router = useRouter();
  const checkoutHydrated = useStoreHydrated(useCheckoutStore.persist);
  const selectedId = useCheckoutStore((s) => s.selectedAddressId);
  const syncAddresses = useCheckoutStore((s) => s.syncAddresses);
  const { state, retry } = useCatalogueLoad(loadOrderSummary);

  const addresses = state.status === "ready" ? state.data.addresses : null;
  const address = addresses?.find((a) => a.id === selectedId);
  const addressOk = !!address && isValidAddress(address);
  const mustChooseAddress = checkoutHydrated && addresses !== null && !addressOk;

  useEffect(() => {
    // No valid Supabase address selected: choose one on the Address step
    // (never fall back to a sample address).
    if (mustChooseAddress) router.replace("/checkout/address");
  }, [mustChooseAddress, router]);

  useEffect(() => {
    // Keep the store's copy fresh for Payment (the selection is unchanged).
    if (addresses && addressOk) syncAddresses(addresses);
  }, [addresses, addressOk, syncAddresses]);

  if (state.status === "error") {
    return (
      <div className="pb-10">
        <div className="mt-[30px]">
          <CheckoutStepper current={2} />
        </div>
        <div className="mt-10">
          <CatalogueError title="Couldn’t load your order." message={state.message} onRetry={retry} />
        </div>
      </div>
    );
  }
  if (state.status === "loading" || !checkoutHydrated || !address || !addressOk) {
    return (
      <div aria-busy="true" aria-label="Loading order summary" className="animate-pulse">
        <div className="mt-[30px]">
          <CheckoutStepper current={2} />
        </div>
        <div className="mx-gutter mt-10 h-[183px] rounded-[20px] bg-surface" />
        <div className="mx-gutter mt-10 h-[200px] rounded bg-surface" />
      </div>
    );
  }

  return <OrderSummaryContents catalog={state.data.catalog} address={address} />;
}

function OrderSummaryContents({ catalog, address }: { catalog: Record<string, BagProduct>; address: Address }) {
  const router = useRouter();
  const bagItems = useBagStore((s) => s.items);
  const setQuantity = useBagStore((s) => s.setQuantity);
  const remove = useBagStore((s) => s.remove);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  // Selected items whose product isn't in the catalogue are not shown or
  // priced (nothing is made up for them); a note says so.
  const selected = bagItems.filter(isSelected);
  const items = selected.filter((item) => catalog[item.productId]);
  const unavailableCount = selected.length - items.length;
  const totals = computeBagTotals(bagItems, catalog);
  const pendingItem = items.find((item) => item.id === pendingRemoval);

  useEffect(() => {
    // Nothing left to order (last item removed, or the rest unavailable): back
    // to the Bag, as when the last selected item is removed.
    if (items.length === 0) router.replace("/bag");
  }, [items.length, router]);

  const rows: [string, string][] = [
    [`Price (${totals.selectedQuantity} ${totals.selectedQuantity === 1 ? "item" : "items"})`, formatAmount(totals.subtotal)],
    ["Discount", formatAmount(0)],
    ["Delivery Charges", formatAmount(totals.delivery)],
    ["Platform Fee", formatAmount(totals.platformFee)],
  ];

  return (
    <div className="pb-[calc(116px+env(safe-area-inset-bottom)+40px)]">
      <div className="mt-[30px]">
        <CheckoutStepper current={2} />
      </div>

      <div className="mt-10 px-gutter">
        <DeliverToCard address={address} />
      </div>

      {unavailableCount > 0 && (
        <p role="status" className="mt-4 px-gutter text-[15px] text-ink/50">
          {unavailableCount === 1
            ? "1 selected item isn’t available right now and isn’t included."
            : `${unavailableCount} selected items aren’t available right now and aren’t included.`}
        </p>
      )}

      <BagActionError className="mt-4" />

      {/* Items */}
      <ul aria-label="Items in this order" className="mt-10 border-t border-[#d9d9d9] px-gutter">
        {items.map((item) => (
          <OrderItemRow
            key={item.id}
            item={item}
            product={catalog[item.productId]}
            onQuantityChange={(quantity) => setQuantity(item.id, quantity)}
            onRemoveRequest={() => setPendingRemoval(item.id)}
          />
        ))}
      </ul>

      {/* Price details */}
      <section id="price-details" aria-labelledby="price-details-heading" className="mt-[21px] scroll-mt-6 px-gutter">
        <h2 id="price-details-heading" className="text-body font-semibold">
          Price Details
        </h2>
        <dl className="mt-5 flex flex-col gap-[10px] text-[17px]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <dt className="text-ink/70">{label}</dt>
              <dd className={label.startsWith("Price") ? "font-medium" : "text-ink/70"}>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-[35px] flex items-center justify-between border-t border-[#d9d9d9] pt-[19px] text-[17px]">
          <p className="font-medium">Total Amount</p>
          <p className="font-semibold">{formatAmount(totals.total)}</p>
        </div>
      </section>

      {/* Bottom bar (Figma 1:3638) */}
      <FixedBar>
        <div className="box-content flex h-[116px] items-start justify-between gap-3 border-t border-[#d9d9d9] bg-white pr-[26px] pb-[env(safe-area-inset-bottom)] pl-[25px]">
          <div className="shrink-0 pt-[25px]">
            <p className="text-[22px] text-primary">
              <span className="sr-only">Total </span>₹<span className="font-semibold">{formatNumber(totals.total)}</span>
            </p>
            <button
              type="button"
              onClick={() =>
                document.getElementById("price-details")?.scrollIntoView({ behavior: "smooth" })
              }
              className="mt-1 text-left text-[17px] whitespace-nowrap text-[#4b81f4]"
            >
              View price details
            </button>
          </div>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => router.push("/checkout/payment")}
            className="mt-6 h-[51px] max-w-[173px] min-w-0 flex-1 rounded-[25.5px] bg-primary text-[17px] font-semibold text-white disabled:opacity-50"
          >
            Continue
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
