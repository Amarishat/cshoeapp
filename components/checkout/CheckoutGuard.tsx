"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { isSelected } from "@/lib/pricing";
import { useBagStore } from "@/lib/store/bag";
import { useBagHydrated } from "@/lib/store/useBagHydrated";

/** Checkout needs selected Bag items (from Supabase); otherwise send the user back to /bag. */
export function CheckoutGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useBagHydrated();
  const hasSelection = useBagStore((s) => s.items.some(isSelected));
  const loadError = useBagStore((s) => s.loadError);
  const retry = useBagStore((s) => s.retry);

  useEffect(() => {
    if (hydrated && !hasSelection) router.replace("/bag");
  }, [hydrated, hasSelection, router]);

  if (loadError) {
    return (
      <div className="mt-[30px]">
        <CatalogueError title="Couldn’t load your bag." message={loadError} onRetry={() => void retry()} />
      </div>
    );
  }
  if (!hydrated || !hasSelection) return <div className="flex-1" aria-busy="true" />;
  return <>{children}</>;
}
