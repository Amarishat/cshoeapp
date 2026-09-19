"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PaymentMethodRow } from "@/components/payment/PaymentMethodRow";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { TotalAmountBar } from "@/components/payment/TotalAmountBar";
import { UpiApps } from "@/components/payment/UpiApps";
import { loadBagCatalogue } from "@/lib/data/bagCatalogue";
import { DEFAULT_UPI_APP, paymentMethods, upiApps } from "@/lib/data/paymentMethods";
import { listAddresses } from "@/lib/data/userAddresses";
import { placeOrder } from "@/lib/data/userOrders";
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
  const [orderError, setOrderError] = useState("");

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

  const totals = computeBagTotals(bagItems, catalog);

  function pay() {
    if (processing || !orderable) return;
    setProcessing(true);
    setOrderError("");
    timer.current = setTimeout(() => void submitOrder(), PROCESSING_MS);
  }

  /**
   * After the simulated payment: the database prices the selected Bag rows,
   * creates the order and removes those rows in one transaction. Only a
   * successful order goes to Payment Success; on failure nothing was ordered
   * and the Bag is unchanged.
   */
  async function submitOrder() {
    try {
      const orderNumber = await placeOrder(address.id, upiApp);
      // Payment Success reloads the Bag (the ordered rows are gone from Supabase);
      // doing it here would make the checkout guard send this page to /bag.
      router.replace(`/payment-success?order=${encodeURIComponent(orderNumber)}`);
    } catch (error) {
      setProcessing(false);
      setOrderError(error instanceof Error ? error.message : String(error));
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

      {orderError && (
        <div className="mt-6">
          <CatalogueError title="Your order couldn’t be placed." message={orderError} onRetry={pay} />
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
                disabled={processing}
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
