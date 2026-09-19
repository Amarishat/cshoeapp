"use client";

import { useSyncExternalStore } from "react";

interface PersistApi {
  hasHydrated: () => boolean;
  onFinishHydration: (listener: () => void) => () => void;
}

/** True once a persisted zustand store has loaded from localStorage (false on the server). */
export function useStoreHydrated(persist: PersistApi): boolean {
  return useSyncExternalStore(
    (onChange) => persist.onFinishHydration(onChange),
    () => persist.hasHydrated(),
    () => false,
  );
}
