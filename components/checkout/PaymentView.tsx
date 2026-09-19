"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PaymentMethodRow } from "@/components/payment/PaymentMethodRow";
import { TotalAmountBar } from "@/components/payment/TotalAmountBar";
import { UpiApps } from "@/components/payment/UpiApps";
import { DEFAULT_UPI_APP, paymentMethods, upiApps } from "@/lib/data/paymentMethods";
import { buildOrder } from "@/lib/orders";
import { computeBagTotals } from "@/lib/pricing";
import { useBagStore } from "@/lib/store/bag";
import { useOrdersStore } from "@/lib/store/orders";
import type { BagProduct, UpiAppId } from "@/lib/types";
import { CheckoutStepper } from "./CheckoutStepper";
import { useCheckoutAddress } from "./useCheckoutAddress";

const PROCESSING_MS = 1800;

/**
 * Checkout step 3 — Figma frame 1:4858 (everything below the header).
 * Prototype only: "paying" is simulated; no payment gateway is involved.
 */
export function PaymentView({ catalog }: { catalog: Record<string, BagProduct> }) {
  const router = useRouter();
  const { ready, address } = useCheckoutAddress();
  const bagItems = useBagStore((s) => s.items);
  const placeOrder = useOrdersStore((s) => s.placeOrder);

  const [upiOpen, setUpiOpen] = useState(true);
  const [upiApp, setUpiApp] = useState<UpiAppId>(DEFAULT_UPI_APP);
  const [processing, setProcessing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!ready || !address) return <div className="flex-1" aria-busy="true" />;

  const totals = computeBagTotals(bagItems, catalog);

  function pay() {
    if (processing || !address) return;
    setProcessing(true);
    timer.current = setTimeout(() => {
      // Snapshot the order from the current Bag + checkout state, then show success.
      // The success page clears the ordered items from the Bag once it opens.
      placeOrder(buildOrder({ bagItems: useBagStore.getState().items, catalog, address, upiApp }));
      router.replace("/payment-success");
    }, PROCESSING_MS);
  }

  return (
    <div className="pb-10">
      <div className="mt-[30px]">
        <CheckoutStepper current={3} />
      </div>

      <div className="mt-10 px-gutter">
        <TotalAmountBar totals={totals} />
      </div>

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
