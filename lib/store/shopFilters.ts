"use client";

import { create } from "zustand";
import { DEFAULT_SHOP_FILTERS, type ShopFilters } from "@/lib/shopFilters";

interface ShopFilterState {
  /** Applied Shop filters. In memory only: kept while browsing, reset on reload. */
  filters: ShopFilters;
  /** Filters screen was opened from Shop, so Apply can go back instead of pushing. */
  openedFromShop: boolean;
  apply: (filters: ShopFilters) => void;
  setOpenedFromShop: (value: boolean) => void;
}

export const useShopFilterStore = create<ShopFilterState>()((set) => ({
  filters: DEFAULT_SHOP_FILTERS,
  openedFromShop: false,
  apply: (filters) => set({ filters }),
  setOpenedFromShop: (openedFromShop) => set({ openedFromShop }),
}));
