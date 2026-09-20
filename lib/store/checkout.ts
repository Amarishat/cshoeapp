"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Address } from "@/lib/types";

interface CheckoutState {
  addresses: Address[];
  /** Delivery address for this order (Order Summary "Deliver to"). */
  selectedAddressId: string | null;
  selectAddress: (id: string) => void;
  /**
   * The addresses loaded from Supabase have replaced the list above (not
   * persisted: false on every page load until the Address screen loads them).
   */
  addressesSynced: boolean;
  /**
   * Replaces the list with the user's Supabase addresses so the next checkout
   * steps (Order Summary, Payment) use them. Keeps the selection if it is
   * still in the list, otherwise selects the default address (or none).
   */
  syncAddresses: (addresses: Address[]) => void;
}

/** Supabase gives every address a uuid; V1's device-only ids were "addr-…". */
const isSupabaseId = (id: string | null): id is string =>
  id !== null && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      // Empty until the Address screen loads the user's own addresses from
      // Supabase (syncAddresses); nothing is shown before that.
      addresses: [],
      selectedAddressId: null,
      selectAddress: (id) => set({ selectedAddressId: id }),
      addressesSynced: false,
      syncAddresses: (addresses) =>
        set((state) => ({
          addresses,
          selectedAddressId: addresses.some((a) => a.id === state.selectedAddressId)
            ? state.selectedAddressId
            : (addresses.find((a) => a.isDefault)?.id ?? null),
          addressesSynced: true,
        })),
    }),
    {
      name: "cs-checkout",
      storage: createJSONStorage(() => localStorage),
      // Only the chosen address is remembered on the device; the addresses
      // themselves are the user's Supabase rows, loaded on every visit.
      partialize: (state) => ({ selectedAddressId: state.selectedAddressId }),
      version: 1,
      /**
       * Version 0 also stored the addresses (once seeded with a sample
       * address). Those are dropped; only a chosen Supabase address id is
       * kept — V1's own ids ("addr-…") never existed in Supabase.
       */
      migrate: (persisted, version) => {
        const state = persisted as Partial<CheckoutState> | undefined;
        const selectedAddressId = state?.selectedAddressId ?? null;
        if (version >= 1) return { selectedAddressId };
        return { selectedAddressId: isSupabaseId(selectedAddressId) ? selectedAddressId : null };
      },
      skipHydration: true,
    },
  ),
);
