"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem } from "@/lib/types";

interface BagState {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  /** Removes several items at once (e.g. the ones just ordered). */
  removeItems: (ids: string[]) => void;
  setQuantity: (id: string, quantity: number) => void;
  setSelected: (id: string, selected: boolean) => void;
  setAllSelected: (selected: boolean) => void;
}

export const useBagStore = create<BagState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((state) => {
          // Same shoe in the same size (and not customised) just adds quantity.
          const existing = state.items.find(
            (i) =>
              i.productId === item.productId &&
              i.size === item.size &&
              !i.customization &&
              !item.customization,
          );
          if (!existing) return { items: [...state.items, item] };
          return {
            items: state.items.map((i) =>
              i === existing ? { ...i, quantity: i.quantity + item.quantity } : i,
            ),
          };
        }),
      remove: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      removeItems: (ids) =>
        set((state) => ({ items: state.items.filter((i) => !ids.includes(i.id)) })),
      setQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })),
      setSelected: (id, selected) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, selected } : i)),
        })),
      setAllSelected: (selected) =>
        set((state) => ({ items: state.items.map((i) => ({ ...i, selected })) })),
    }),
    {
      name: "cs-bag",
      storage: createJSONStorage(() => localStorage),
      // Rehydrated after mount by <StoreHydration /> to avoid SSR mismatches.
      skipHydration: true,
    },
  ),
);

/** Number shown in the header bag badge (distinct items, as in Figma's "3/3 Items"). */
export const selectBagCount = (state: BagState) => state.items.length;
