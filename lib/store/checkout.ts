"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Address, AddressInput } from "@/lib/types";

interface CheckoutState {
  addresses: Address[];
  /** Delivery address for this order (Order Summary "Deliver to"). */
  selectedAddressId: string | null;
  selectAddress: (id: string) => void;
  /** Saves a new address, selects it, and returns its id. */
  addAddress: (input: AddressInput) => string;
  updateAddress: (id: string, input: AddressInput) => void;
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

// Only one address can be the default.
const withDefault = (addresses: Address[], defaultId: string) =>
  addresses.map((a) => ({ ...a, isDefault: a.id === defaultId }));

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      // Empty until the Address screen loads the user's own addresses from
      // Supabase (syncAddresses); nothing is shown before that.
      addresses: [],
      selectedAddressId: null,
      selectAddress: (id) => set({ selectedAddressId: id }),
      addAddress: (input) => {
        const id = `addr-${crypto.randomUUID()}`;
        set((state) => {
          const addresses = [...state.addresses, { ...input, id }];
          return {
            addresses: input.isDefault ? withDefault(addresses, id) : addresses,
            selectedAddressId: id,
          };
        });
        return id;
      },
      updateAddress: (id, input) =>
        set((state) => {
          const addresses = state.addresses.map((a) => (a.id === id ? { ...input, id } : a));
          return { addresses: input.isDefault ? withDefault(addresses, id) : addresses };
        }),
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
      partialize: (state) => ({ addresses: state.addresses, selectedAddressId: state.selectedAddressId }),
      skipHydration: true,
    },
  ),
);
