"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Order } from "@/lib/types";

interface OrdersState {
  /** Newest first. Used by the future Orders / Tracking screens. */
  orders: Order[];
  /** Shown on the Payment Successful screen. */
  lastPlacedOrderId: string | null;
  placeOrder: (order: Order) => void;
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set) => ({
      orders: [],
      lastPlacedOrderId: null,
      placeOrder: (order) =>
        set((state) => ({ orders: [order, ...state.orders], lastPlacedOrderId: order.id })),
    }),
    {
      name: "cs-orders",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
