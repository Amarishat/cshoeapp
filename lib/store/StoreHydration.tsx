"use client";

import { useEffect } from "react";
import { useBagStore } from "./bag";
import { useCheckoutStore } from "./checkout";
import { useCustomizationStore } from "./customization";
import { usePreferencesStore } from "./preferences";
import { useWishlistStore } from "./wishlist";

/**
 * Loads persisted client stores from localStorage once the app has mounted,
 * and the Bag and wishlist from Supabase (they aren't saved on the device).
 */
export function StoreHydration() {
  useEffect(() => {
    void useBagStore.getState().load();
    void useWishlistStore.getState().load();
    void useCheckoutStore.persist.rehydrate();
    void useCustomizationStore.persist.rehydrate();
    void usePreferencesStore.persist.rehydrate();
  }, []);
  return null;
}
