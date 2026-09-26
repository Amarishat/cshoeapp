"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PaymentMethodRow } from "@/components/payment/PaymentMethodRow";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { TotalAmountBar } from "@/components/payment/TotalAmountBar";
import { UpiApps } from "@/components/payment/UpiApps";
import { loadBagCatalogue } from "@/lib/data/bagCatalogue";
import { DEFAULT_UPI_APP, paymentMethods, upiApps } from "@/lib/data/paymentMethods";
import { listAddresses } from "@/lib/data/userAddresses";
import { isStaleDesign } from "@/lib/customizationCheck";
import { OrderError, placeOrder, REVIEW_BAG_CODES } from "@/lib/data/userOrders";
import { computeBagTotals, isSelected } from "@/lib/pricing";
import { useBagStore } from "@/lib/store/bag";
import { useCheckoutStore } from "@/lib/store/checkout";
import { useStoreHydrated } from "@/lib/store/useStoreHydrated";
import type { Address, BagProduct, UpiAppId } from "@/lib/types";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";
import { isValidAddress } from "@/lib/validation/address";
import { CheckoutStepper } from "./CheckoutStepper";

const PROCESSING_MS = 1800;

/** Products (the Bag's catalogue) and the guest's saved addresses, from Supabase. */
async function loadPayment() {
  const [catalog, addresses] = await Promise.all([loadBagCatalogue(), listAddresses()]);
  return { catalog, addresses };
}

/**
 * Checkout step 3 — Figma frame 1:4858 (everything below the header).
 * Prototype only: "paying" is simulated; no payment gateway is involved.
 * Products and the delivery address come from Supabase; the selected address
 * id comes from the checkout store and the Bag from Supabase (bag store).
 * Payment can't start until both have loaded. After the simulated payment the
 * order is placed by the database function place_order().
 */
export function PaymentView() {
  const router = useRouter();
  const checkoutHydrated = useStoreHydrated(useCheckoutStore.persist);
  const selectedId = useCheckoutStore((s) => s.selectedAddressId);
  const { state, retry } = useCatalogueLoad(loadPayment);

  const addresses = state.status === "ready" ? state.data.addresses : null;
  const address = addresses?.find((a) => a.id === selectedId);
  const addressOk = !!address && isValidAddress(address);
  const mustChooseAddress = checkoutHydrated && addresses !== null && !addressOk;

  useEffect(() => {
    // No valid Supabase address selected: choose one on the Address step
    // (never fall back to a sample address).
    if (mustChooseAddress) router.replace("/checkout/address");
  }, [mustChooseAddress, router]);

  if (state.status === "error") {
    return (
      <div className="pb-10">
        <div className="mt-[30px]">
          <CheckoutStepper current={3} />
        </div>
        <div className="mt-10">
          <CatalogueError title="Couldn’t load your payment details." message={state.message} onRetry={retry} />
        </div>
      </div>
    );
  }
  if (state.status === "loading" || !checkoutHydrated || !address || !addressOk) {
    return (
      <div aria-busy="true" aria-label="Loading payment" className="animate-pulse">
        <div className="mt-[30px]">
          <CheckoutStepper current={3} />
        </div>
        <div className="mx-gutter mt-10 h-[66px] rounded bg-surface" />
        <div className="mx-gutter mt-10 h-[300px] rounded bg-surface" />
      </div>
    );
  }

  return <PaymentContents catalog={state.data.catalog} address={address} />;
}

function PaymentContents({ catalog, address }: { catalog: Record<string, BagProduct>; address: Address }) {
  const router = useRouter();
  const bagItems = useBagStore((s) => s.items);
  // Why the last attempt failed; `reviewBag` when trying again would fail the same way.
  const [orderError, setOrderError] = useState<{ message: string; reviewBag: boolean } | null>(null);

  const [upiOpen, setUpiOpen] = useState(true);
  const [upiApp, setUpiApp] = useState<UpiAppId>(DEFAULT_UPI_APP);
  const [processing, setProcessing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Only selected items with a catalogue product can be ordered (as in Order Summary).
  const orderable = bagItems.some((item) => isSelected(item) && catalog[item.productId]);
  useEffect(() => {
    if (!orderable && !processing) router.replace("/bag");
  }, [orderable, processing, router]);
  // A selected item without one can't be ordered — place_order() refuses the
  // whole order — so Pay waits until it's removed in the Bag.
  const unavailableCount = bagItems.filter((item) => isSelected(item) && !catalog[item.productId]).length;
  // So does a selected design that no longer fits its customiser.
  const staleCount = bagItems.filter(
    (item) => isSelected(item) && catalog[item.productId] && isStaleDesign(item, catalog[item.productId]),
  ).length;
  const blocked = unavailableCount > 0 || staleCount > 0;

  const totals = computeBagTotals(bagItems, catalog);

  function pay() {
    if (processing || !orderable || blocked) return;
    setProcessing(true);
    setOrderError(null);
    timer.current = setTimeout(() => void submitOrder(), PROCESSING_MS);
  }

  /**
   * After the simulated payment: the database prices the selected Bag rows,
   * creates the order and removes those rows in one transaction. It is told
   * the total shown here and refuses if it would charge anything else. Only
   * a successful order goes to Payment Success; on failure nothing was
   * ordered and the Bag is unchanged.
   */
  async function submitOrder() {
    try {
      const orderNumber = await placeOrder(address.id, upiApp, totals.total);
      // Payment Success reloads the Bag (the ordered rows are gone from Supabase);
      // doing it here would make the checkout guard send this page to /bag.
      router.replace(`/payment-success?order=${encodeURIComponent(orderNumber)}`);
    } catch (error) {
      setProcessing(false);
      setOrderError({
        message: error instanceof Error ? error.message : String(error),
        reviewBag: error instanceof OrderError && REVIEW_BAG_CODES.includes(error.code ?? ""),
      });
    }
  }

  return (
    <div className="pb-10">
      <div className="mt-[30px]">
        <CheckoutStepper current={3} />
      </div>

      <div className="mt-10 px-gutter">
        <TotalAmountBar totals={totals} />
      </div>

      {staleCount > 0 && (
        <p role="status" className="mt-4 px-gutter text-[15px] text-danger">
          {staleCount === 1
            ? "A customised item can’t be ordered as designed right now, so this order can’t be placed. "
            : `${staleCount} customised items can’t be ordered as designed right now, so this order can’t be placed. `}
          <Link href="/bag" className="font-medium text-ink underline">
            Recreate or remove {staleCount === 1 ? "it" : "them"} in your bag
          </Link>
        </p>
      )}

      {unavailableCount > 0 && (
        <p role="status" className="mt-4 px-gutter text-[15px] text-ink/50">
          {unavailableCount === 1
            ? "1 selected item isn’t available right now, so this order can’t be placed. "
            : `${unavailableCount} selected items aren’t available right now, so this order can’t be placed. `}
          <Link href="/bag" className="font-medium text-ink underline">
            Remove {unavailableCount === 1 ? "it" : "them"} in your bag
          </Link>
        </p>
      )}

      {orderError && (
        <div className="mt-6">
          {orderError.reviewBag ? (
            // Same look as CatalogueError, but "Review your bag" instead of a retry that would fail again.
            <div role="alert" className="mx-gutter rounded-[15px] bg-surface px-4 py-4">
              <p className="font-medium">Your order couldn’t be placed.</p>
              <p className="mt-1 text-[15px] text-ink/60 [overflow-wrap:anywhere]">{orderError.message}</p>
              <Link
                href="/bag"
                className="mt-3 inline-flex h-10 items-center rounded-full border border-border bg-white px-5 text-[15px] font-medium"
              >
                Review your bag
              </Link>
            </div>
          ) : (
            <CatalogueError title="Your order couldn’t be placed." message={orderError.message} onRetry={pay} />
          )}
        </div>
      )}

      <ul aria-label="Payment methods" className="mt-10 border-t border-border/70">
        {paymentMethods.map((method) => (
          <PaymentMethodRow
            key={method.id}
            method={method}
            open={method.id === "upi" && upiOpen}
            onToggle={method.id === "upi" ? () => setUpiOpen(!upiOpen) : undefined}
          >
            {method.id === "upi" && (
              <UpiApps
                apps={upiApps}
                selected={upiApp}
                onSelect={setUpiApp}
                onPay={pay}
                disabled={processing || blocked}
              />
            )}
          </PaymentMethodRow>
        ))}
      </ul>

      {processing && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-50 mx-auto flex w-full max-w-app flex-col items-center justify-center gap-5 bg-page"
        >
          <span
            aria-hidden
            className="size-14 animate-spin rounded-full border-4 border-[#4b81f4]/20 border-t-[#4b81f4]"
          />
          <p className="text-label font-medium">Processing payment…</p>
        </div>
      )}
    </div>
  );
}
