"use client";

import { useSyncExternalStore } from "react";
import { useBagStore } from "./bag";

/** True once the saved bag has been loaded from localStorage (always false on the server). */
export function useBagHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useBagStore.persist.onFinishHydration(onChange),
    () => useBagStore.persist.hasHydrated(),
    () => false,
  );
}
