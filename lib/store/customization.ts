"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CustomizationSelection } from "@/lib/types";

interface CustomizationState {
  /** In-progress designs, keyed by product id. */
  drafts: Record<string, CustomizationSelection>;
  setColour: (productId: string, partId: string, colourId: string) => void;
  clear: (productId: string) => void;
}

export const useCustomizationStore = create<CustomizationState>()(
  persist(
    (set) => ({
      drafts: {},
      setColour: (productId, partId, colourId) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [productId]: { ...state.drafts[productId], [partId]: colourId },
          },
        })),
      clear: (productId) =>
        set((state) => {
          const drafts = { ...state.drafts };
          delete drafts[productId];
          return { drafts };
        }),
    }),
    {
      name: "cs-customization",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
