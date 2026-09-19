"use client";

import { useBagStore } from "@/lib/store/bag";

/** The last Bag change that couldn't be saved (the Bag shows its previous state). */
export function BagActionError({ className }: { className?: string }) {
  const actionError = useBagStore((s) => s.actionError);
  if (!actionError) return null;
  return (
    <p role="alert" className={`px-gutter text-[15px] text-danger [overflow-wrap:anywhere] ${className ?? ""}`}>
      {actionError}
    </p>
  );
}
