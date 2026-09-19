"use client";

import { useBagStore } from "./bag";

/** True once the Bag has been loaded from Supabase (false while loading or after an error). */
export function useBagHydrated(): boolean {
  return useBagStore((s) => s.status === "ready");
}
