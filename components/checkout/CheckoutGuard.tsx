"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { isSelected } from "@/lib/pricing";
import { useBagStore } from "@/lib/store/bag";
import { useBagHydrated } from "@/lib/store/useBagHydrated";

/** Checkout needs selected Bag items; otherwise send the user back to /bag. */
export function CheckoutGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useBagHydrated();
  const hasSelection = useBagStore((s) => s.items.some(isSelected));

  useEffect(() => {
    if (hydrated && !hasSelection) router.replace("/bag");
  }, [hydrated, hasSelection, router]);

  if (!hydrated || !hasSelection) return <div className="flex-1" aria-busy="true" />;
  return <>{children}</>;
}
