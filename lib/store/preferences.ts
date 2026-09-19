"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Audience } from "@/lib/types";

interface PreferencesState {
  /** Men / Women / Kids — shared by the Home, Shop, Customise and Filters tabs. */
  audience: Audience;
  setAudience: (audience: Audience) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      audience: "men",
      setAudience: (audience) => set({ audience }),
    }),
    {
      name: "cs-preferences",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
