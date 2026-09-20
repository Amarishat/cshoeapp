"use client";

import { create } from "zustand";
import {
  addWishlistItem,
  listWishlist,
  migrateLegacyWishlist,
  removeWishlistItem,
} from "@/lib/data/userWishlist";

/*
 * The wishlist. Supabase (public.wishlist_items, via lib/data/userWishlist)
 * is the source of truth; this store is the screen's copy of it. It is not
 * saved on the device. Changes are written to Supabase first and only then
 * applied here (no optimistic updates), one at a time in the order they were
 * made. If a write fails, the saved products stay as they were and
 * `actionError` says why.
 */

export type WishlistStatus = "idle" | "loading" | "ready" | "error";

interface WishlistState {
  status: WishlistStatus;
  /** Why the wishlist couldn't be loaded (status "error"). */
  loadError: string | null;
  /** Why the last change couldn't be saved (cleared by the next successful change). */
  actionError: string | null;
  productIds: string[];
  /** Loads the wishlist (moving a V1 device-only one into Supabase first). Runs once unless it failed. */
  load: () => Promise<void>;
  retry: () => Promise<void>;
  /** These resolve to null when saved, or to an error message (they never reject). */
  add: (productId: string) => Promise<string | null>;
  remove: (productId: string) => Promise<string | null>;
  /** Saves the product, or removes it if it is already saved. */
  toggle: (productId: string) => Promise<string | null>;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Changes run one after another so they reach Supabase in the order made.
let queue: Promise<unknown> = Promise.resolve();
let loading: Promise<void> | null = null;

export const useWishlistStore = create<WishlistState>()((set, get) => {
  async function loadNow() {
    set({ status: "loading", loadError: null });
    try {
      // A wishlist saved by V1 moves into Supabase first; if that fails the
      // ids stay on the device and the wishlist below is still shown.
      await migrateLegacyWishlist().catch(() => {});
      set({ productIds: await listWishlist(), status: "ready" });
    } catch (error) {
      set({ status: "error", loadError: messageOf(error) });
    }
  }

  /**
   * Runs one change after the wishlist has loaded. `write` saves it to
   * Supabase and returns the saved ids; the copy is updated only on success.
   */
  function change(write: (ids: string[]) => Promise<string[]>) {
    const task = queue.then(async (): Promise<string | null> => {
      if (get().status !== "ready") await get().load();
      if (get().status !== "ready") return get().loadError ?? "Your wishlist isn’t available right now.";
      try {
        set({ productIds: await write(get().productIds), actionError: null });
        return null;
      } catch (error) {
        const message = messageOf(error);
        set({ actionError: message });
        return message;
      }
    });
    queue = task;
    return task;
  }

  const saved = async (ids: string[], productId: string) => {
    await addWishlistItem(productId);
    // Saving one that is already saved keeps the list as it is.
    return ids.includes(productId) ? ids : [...ids, productId];
  };
  const unsaved = async (ids: string[], productId: string) => {
    await removeWishlistItem(productId);
    return ids.filter((id) => id !== productId);
  };

  return {
    status: "idle",
    loadError: null,
    actionError: null,
    productIds: [],
    load: () => {
      if (get().status === "ready") return Promise.resolve();
      loading ??= loadNow().finally(() => {
        loading = null;
      });
      return loading;
    },
    retry: () => get().load(),
    add: (productId) => change((ids) => saved(ids, productId)),
    remove: (productId) => change((ids) => unsaved(ids, productId)),
    // Saved or not is decided once the wishlist has loaded, not when tapped.
    toggle: (productId) =>
      change((ids) => (ids.includes(productId) ? unsaved(ids, productId) : saved(ids, productId))),
  };
});

/** True once the wishlist has been loaded from Supabase (false while loading or after an error). */
export const selectWishlistReady = (state: WishlistState) => state.status === "ready";
