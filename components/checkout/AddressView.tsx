"use client";

import { useRouter } from "next/navigation";
import { FixedBar } from "@/components/layout/FixedBar";
import { computeBagTotals, formatPrice } from "@/lib/pricing";
import { useBagStore } from "@/lib/store/bag";
import { useCheckoutStore } from "@/lib/store/checkout";
import { isValidAddress } from "@/lib/validation/address";
import type { BagProduct, LocationState } from "@/lib/types";
import { AddressManager } from "./AddressManager";
import { CheckoutStepper } from "./CheckoutStepper";

/** Checkout step 1 — Figma frame 1:3396 (everything below the header). */
export function AddressView({
  catalog,
  locations,
}: {
  catalog: Record<string, BagProduct>;
  locations: LocationState[];
}) {
  const router = useRouter();
  const selected = useCheckoutStore((s) => s.addresses.find((a) => a.id === s.selectedAddressId));
  // Only addresses loaded from Supabase count (not the store's cached list).
  const synced = useCheckoutStore((s) => s.addressesSynced);
  const bagItems = useBagStore((s) => s.items);

  const canContinue = synced && !!selected && isValidAddress(selected);
  const { total } = computeBagTotals(bagItems, catalog);

  return (
    <div className="pb-[calc(94px+env(safe-area-inset-bottom)+40px)]">
      <div className="mt-[30px]">
        <CheckoutStepper current={1} />
      </div>

      <AddressManager locations={locations} className="mt-10" />

      {/* Continue bar — same pattern as the Order Summary frame (1:3644). */}
      <FixedBar>
        <div className="box-content flex h-[94px] items-center justify-between bg-white pr-[26px] pb-[env(safe-area-inset-bottom)] pl-[28px] shadow-[0_-0.5px_4px_rgba(0,0,0,0.25)]">
          <p className="text-body font-semibold">
            <span className="sr-only">Total </span>
            {formatPrice(total)}
          </p>
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => router.push("/checkout/order-summary")}
            className="h-[51px] w-[173px] rounded-[25.5px] bg-primary text-[17px] font-semibold text-white disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </FixedBar>
    </div>
  );
}
