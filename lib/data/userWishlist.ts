import { getSupabaseClient } from "@/lib/supabase/client";
import { ensureGuestSession } from "@/lib/supabase/guestSession";

/*
 * The current (anonymous guest) user's wishlist in Supabase
 * (public.wishlist_items). Every call first waits for the guest session; rows
 * are written with that session's user id and RLS only returns the user's own
 * rows. The table's primary key (user_id, product_id) makes a product's row
 * unique, so a product can only be saved once. Errors are thrown as-is —
 * never replaced with local data.
 */

interface WishlistRow {
  product_id: string;
  created_at: string;
}

export class WishlistError extends Error {
  /** Postgres/PostgREST error code, when there is one. */
  code?: string;
  constructor(action: string, cause: { message: string; code?: string }) {
    super(`Could not ${action}: ${cause.message}`, { cause });
    this.name = "WishlistError";
    this.code = cause.code;
  }
}

async function currentUserId(): Promise<string> {
  return (await ensureGuestSession()).user.id;
}

/** The user's saved product ids, in the order they were saved. */
export async function listWishlist(): Promise<string[]> {
  const userId = await currentUserId();
  const { data, error } = await getSupabaseClient()
    .from("wishlist_items")
    .select("product_id, created_at")
    .eq("user_id", userId)
    .order("created_at")
    .order("product_id")
    .overrideTypes<WishlistRow[], { merge: false }>();
  if (error) throw new WishlistError("load your wishlist", error);
  return data.map((row) => row.product_id);
}

/**
 * Saves a product. Saving one that is already saved is not an error (the
 * primary key keeps it to one row).
 */
export async function addWishlistItem(productId: string): Promise<void> {
  const userId = await currentUserId();
  const { error } = await getSupabaseClient()
    .from("wishlist_items")
    // Insert, doing nothing if the product is already saved (the primary key
    // decides). Never an update, so it needs no update privilege.
    .upsert({ user_id: userId, product_id: productId }, { ignoreDuplicates: true });
  // 23505 as well, in case the row appears between the check and the insert.
  if (!error || error.code === "23505") return;
  throw new WishlistError(
    "save to your wishlist",
    // 23503: no such product in the catalogue.
    error.code === "23503" ? { message: "that product isn’t in the catalogue", code: error.code } : error,
  );
}

export async function removeWishlistItem(productId: string): Promise<void> {
  const userId = await currentUserId();
  const { error } = await getSupabaseClient()
    .from("wishlist_items")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);
  if (error) throw new WishlistError("remove from your wishlist", error);
}

// ---------------------------------------------------------------------------
// One-time move of a V1 device-only wishlist into Supabase
// ---------------------------------------------------------------------------

/** V1 kept the wishlist in localStorage under this key (zustand persist). */
const LEGACY_KEY = "cs-wishlist";
/** Saved ids that can't exist in Supabase (unknown product), kept aside, never uploaded. */
const UNMIGRATED_KEY = "cs-wishlist-unmigrated";

function readLegacyIds(): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    const ids = raw ? JSON.parse(raw)?.state?.productIds : null;
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeLegacyIds(ids: string[]) {
  if (ids.length === 0) localStorage.removeItem(LEGACY_KEY);
  else localStorage.setItem(LEGACY_KEY, JSON.stringify({ state: { productIds: ids }, version: 0 }));
}

function keepUnmigrated(productId: string) {
  try {
    const raw = localStorage.getItem(UNMIGRATED_KEY);
    const kept: string[] = raw ? JSON.parse(raw) : [];
    if (!kept.includes(productId)) {
      localStorage.setItem(UNMIGRATED_KEY, JSON.stringify([...kept, productId]));
    }
  } catch {
    // Storage full or blocked: the id simply isn't kept aside.
  }
}

async function migrateLegacyWishlistUnlocked(): Promise<void> {
  let remaining = readLegacyIds();
  while (remaining.length > 0) {
    const [productId, ...rest] = remaining;
    try {
      await addWishlistItem(productId);
    } catch (error) {
      // Unknown product: it can't be in Supabase, so it is kept aside instead.
      // Anything else (e.g. offline) leaves this id saved for the next try.
      if (!(error instanceof WishlistError && error.code === "23503")) throw error;
      keepUnmigrated(productId);
    }
    // Written after each id, so a retry never re-uploads a saved one.
    remaining = rest;
    writeLegacyIds(remaining);
  }
}

/**
 * Moves a V1 wishlist saved on this device into Supabase, once. Each id is
 * removed from the device copy only after Supabase has it (or it turns out
 * not to be a real product, in which case it is kept aside, not uploaded), so
 * a failure leaves the rest on the device for the next try. A browser lock
 * stops two tabs migrating at the same time.
 */
export async function migrateLegacyWishlist(): Promise<void> {
  if (readLegacyIds().length === 0) {
    localStorage.removeItem(LEGACY_KEY);
    return;
  }
  if (typeof navigator !== "undefined" && navigator.locks) {
    await navigator.locks.request("cs-wishlist-migration", () => migrateLegacyWishlistUnlocked());
  } else {
    await migrateLegacyWishlistUnlocked();
  }
}
