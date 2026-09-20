"use client";

import { create } from "zustand";
import {
  addCartItem,
  listCart,
  migrateLegacyBag,
  removeCartItems,
  setAllCartSelected,
  setCartQuantity,
  setCartSelected,
  updateCartCustomization,
} from "@/lib/data/userCart";
import type { CartItem, CustomizationSelection } from "@/lib/types";

/*
 * The Bag. Supabase (public.cart_items, via lib/data/userCart) is the source
 * of truth; this store is the screen's copy of it. It is not saved on the
 * device. Changes are written to Supabase first and only then applied here
 * (no optimistic updates), one at a time in the order they were made. If a
 * write fails, the items stay as they were and `actionError` says why.
 */

export type BagStatus = "idle" | "loading" | "ready" | "error";

interface BagState {
  status: BagStatus;
  /** Why the Bag couldn't be loaded (status "error"). */
  loadError: string | null;
  /** Why the last change couldn't be saved (cleared by the next successful change). */
  actionError: string | null;
  items: CartItem[];
  /** Loads the Bag (moving a V1 device-only Bag into Supabase first). Runs once unless it failed. */
  load: () => Promise<void>;
  retry: () => Promise<void>;
  /**
   * The actions below resolve to null when saved, or to an error message
   * (they never reject). `item.id` is ignored for `add`: Supabase assigns it.
   */
  add: (item: CartItem) => Promise<string | null>;
  remove: (id: string) => Promise<string | null>;
  /** Removes several items at once (e.g. the ones just ordered). */
  removeItems: (ids: string[]) => Promise<string | null>;
  setQuantity: (id: string, quantity: number) => Promise<string | null>;
  setSelected: (id: string, selected: boolean) => Promise<string | null>;
  setAllSelected: (selected: boolean) => Promise<string | null>;
  /** Replaces one item's design; its product, size, quantity and selection stay. */
  setCustomization: (id: string, customization: CustomizationSelection | null) => Promise<string | null>;
  /** Reloads the Bag from Supabase (e.g. after place_order() removed the ordered rows). */
  refresh: () => Promise<string | null>;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Changes run one after another so they reach Supabase in the order made.
let queue: Promise<unknown> = Promise.resolve();
let loading: Promise<void> | null = null;

export const useBagStore = create<BagState>()((set, get) => {
  async function loadNow() {
    set({ status: "loading", loadError: null });
    try {
      await migrateLegacyBag();
      set({ items: await listCart(), status: "ready" });
    } catch (error) {
      set({ status: "error", loadError: messageOf(error) });
    }
  }

  /** Runs one change after the Bag has loaded; `apply` updates the copy only on success. */
  function change(write: () => Promise<void>, apply: (items: CartItem[]) => CartItem[] | Promise<CartItem[]>) {
    const run = queue.then(async (): Promise<string | null> => {
      if (get().status !== "ready") await get().load();
      if (get().status !== "ready") return get().loadError ?? "Your bag isn’t available right now.";
      try {
        await write();
        set({ items: await apply(get().items), actionError: null });
        return null;
      } catch (error) {
        const message = messageOf(error);
        set({ actionError: message });
        return message;
      }
    });
    queue = run;
    return run;
  }

  return {
    status: "idle",
    loadError: null,
    actionError: null,
    items: [],
    load: () => {
      if (get().status === "ready") return Promise.resolve();
      loading ??= loadNow().finally(() => {
        loading = null;
      });
      return loading;
    },
    retry: () => get().load(),
    // Merging is decided in Supabase, so reload the Bag after adding.
    add: (item) => change(() => addCartItem(item), () => listCart()),
    remove: (id) =>
      change(
        () => removeCartItems([id]),
        (items) => items.filter((i) => i.id !== id),
      ),
    removeItems: (ids) =>
      change(
        () => removeCartItems(ids),
        (items) => items.filter((i) => !ids.includes(i.id)),
      ),
    setQuantity: (id, quantity) =>
      change(
        () => setCartQuantity(id, quantity),
        (items) => items.map((i) => (i.id === id ? { ...i, quantity } : i)),
      ),
    setSelected: (id, selected) =>
      change(
        () => setCartSelected(id, selected),
        (items) => items.map((i) => (i.id === id ? { ...i, selected } : i)),
      ),
    setAllSelected: (selected) =>
      change(
        () => setAllCartSelected(selected),
        (items) => items.map((i) => ({ ...i, selected })),
      ),
    setCustomization: (id, customization) => {
      let updated: CartItem | null = null;
      return change(
        async () => {
          updated = await updateCartCustomization(id, customization);
        },
        (items) => items.map((i) => (i.id === id && updated ? updated : i)),
      );
    },
    refresh: () =>
      change(
        async () => {},
        () => listCart(),
      ),
  };
});

/** Number shown in the header bag badge (distinct items, as in Figma's "3/3 Items"). */
export const selectBagCount = (state: BagState) => state.items.length;
