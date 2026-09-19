"use client";

import { useEffect } from "react";
import { useBagStore } from "./bag";
import { useCheckoutStore } from "./checkout";
import { useCustomizationStore } from "./customization";
import { useNotificationsStore } from "./notifications";
import { useOrdersStore } from "./orders";
import { usePreferencesStore } from "./preferences";
import { useWishlistStore } from "./wishlist";

/** Loads persisted client stores from localStorage once the app has mounted. */
export function StoreHydration() {
  useEffect(() => {
    void useBagStore.persist.rehydrate();
    void useCheckoutStore.persist.rehydrate();
    void useOrdersStore.persist.rehydrate();
    void useCustomizationStore.persist.rehydrate();
    void useWishlistStore.persist.rehydrate();
    void usePreferencesStore.persist.rehydrate();
    void useNotificationsStore.persist.rehydrate();
  }, []);
  return null;
}
