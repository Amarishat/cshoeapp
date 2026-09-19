"use client";

import { useEffect } from "react";
import { useBagStore } from "./bag";
import { useCheckoutStore } from "./checkout";
import { useCustomizationStore } from "./customization";
import { usePreferencesStore } from "./preferences";
import { useWishlistStore } from "./wishlist";

/**
 * Loads persisted client stores from localStorage once the app has mounted,
 * and the Bag from Supabase (it isn't saved on the device).
 */
export function StoreHydration() {
  useEffect(() => {
    void useBagStore.getState().load();
    void useCheckoutStore.persist.rehydrate();
    void useCustomizationStore.persist.rehydrate();
    void useWishlistStore.persist.rehydrate();
    void usePreferencesStore.persist.rehydrate();
  }, []);
  return null;
}
