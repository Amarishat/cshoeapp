"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCheckoutStore } from "@/lib/store/checkout";
import { useStoreHydrated } from "@/lib/store/useStoreHydrated";
import { isValidAddress } from "@/lib/validation/address";

/**
 * The selected delivery address for checkout steps after Address. Redirects
 * to /checkout/address when there is no valid selection.
 */
export function useCheckoutAddress() {
  const router = useRouter();
  const hydrated = useStoreHydrated(useCheckoutStore.persist);
  const address = useCheckoutStore((s) => s.addresses.find((a) => a.id === s.selectedAddressId));
  const ok = !!address && isValidAddress(address);

  useEffect(() => {
    if (hydrated && !ok) router.replace("/checkout/address");
  }, [hydrated, ok, router]);

  return { ready: hydrated && ok, address: ok ? address : undefined };
}
