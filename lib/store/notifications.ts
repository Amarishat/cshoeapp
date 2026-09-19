"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface NotificationsState {
  /** Order ids whose "Order confirmed" notification has been read. Nothing else is stored. */
  readOrderIds: string[];
  markRead: (orderId: string) => void;
  markAllRead: (orderIds: string[]) => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      readOrderIds: [],
      markRead: (orderId) =>
        set((state) =>
          state.readOrderIds.includes(orderId) ? state : { readOrderIds: [...state.readOrderIds, orderId] },
        ),
      markAllRead: (orderIds) =>
        set((state) => ({ readOrderIds: [...new Set([...state.readOrderIds, ...orderIds])] })),
    }),
    {
      name: "cs-notifications",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
