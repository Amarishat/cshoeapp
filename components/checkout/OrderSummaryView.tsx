"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FixedBar } from "@/components/layout/FixedBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { computeBagTotals, formatAmount, isSelected } from "@/lib/pricing";
import { useBagStore } from "@/lib/store/bag";
import { useCheckoutStore } from "@/lib/store/checkout";
import { useStoreHydrated } from "@/lib/store/useStoreHydrated";
import type { BagProduct } from "@/lib/types";
import { isValidAddress } from "@/lib/validation/address";
import { CheckoutStepper } from "./CheckoutStepper";
import { DeliverToCard } from "./DeliverToCard";
import { OrderItemRow } from "./OrderItemRow";

/**
 * Checkout step 2 — Figma frame 1:3495 (everything below the header).
 * V1 leaves out Figma's current-location, CS Coins and gift sections and its
 * sample prices; totals come from the same computeBagTotals as the Bag.
 */
export function OrderSummaryView({ catalog }: { catalog: Record<string, BagProduct> }) {
  const router = useRouter();
  const checkoutHydrated = useStoreHydrated(useCheckoutStore.persist);
  const addresses = useCheckoutStore((s) => s.addresses);
  const selectedId = useCheckoutStore((s) => s.selectedAddressId);
  const bagItems = useBagStore((s) => s.items);
  const setQuantity = useBagStore((s) => s.setQuantity);
  const remove = useBagStore((s) => s.remove);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  const address = addresses.find((a) => a.id === selectedId);
  const addressOk = !!address && isValidAddress(address);

  useEffect(() => {
    if (checkoutHydrated && !addressOk) router.replace("/checkout/address");
  }, [checkoutHydrated, addressOk, router]);

  const items = bagItems.filter((item) => isSelected(item) && catalog[item.productId]);
  const totals = computeBagTotals(bagItems, catalog);
  const pendingItem = items.find((item) => item.id === pendingRemoval);

  if (!checkoutHydrated || !address || !addressOk) {
    return <div className="flex-1" aria-busy="true" />;
  }

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
              <span className="sr-only">Total </span>₹<span className="font-semibold">{totals.total}</span>
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
