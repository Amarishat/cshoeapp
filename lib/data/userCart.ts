import { getCustomizationConfig } from "@/lib/data/supabaseCatalog";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ensureGuestSession } from "@/lib/supabase/guestSession";
import type { CartItem, CustomizationSelection } from "@/lib/types";

/*
 * The current (anonymous guest) user's Bag in Supabase (public.cart_items).
 * Every call first waits for the guest session; rows are written with that
 * session's user id and RLS only returns the user's own rows. Errors are
 * thrown as-is — never replaced with mock data.
 *
 * Mapping to the app's CartItem:
 *   id ↔ id (uuid) · product_id ↔ productId · size_uk 7 ↔ size "UK 7"
 *   quantity ↔ quantity · is_selected ↔ selected · customization ↔ customization
 */

interface CartRow {
  id: string;
  product_id: string;
  size_uk: number;
  quantity: number;
  is_selected: boolean;
  customization: CustomizationSelection | null;
  created_at: string;
}

const COLUMNS = "id, product_id, size_uk, quantity, is_selected, customization, created_at";

export class CartError extends Error {
  /** Postgres/PostgREST error code, when there is one. */
  code?: string;
  constructor(action: string, cause: { message: string; code?: string }) {
    super(`Could not ${action}: ${cause.message}`, { cause });
    this.name = "CartError";
    this.code = cause.code;
  }
}

const toCartItem = (row: CartRow): CartItem => ({
  id: row.id,
  productId: row.product_id,
  size: `UK ${Number(row.size_uk)}`,
  quantity: row.quantity,
  ...(row.customization ? { customization: row.customization } : {}),
  selected: row.is_selected,
});

/** "UK 7" → 7, "UK 7.5" → 7.5; null if the text isn't a UK size. */
export function parseSizeUK(size: string): number | null {
  const match = /^UK (\d+(?:\.5)?)$/.exec(size.trim());
  return match ? Number(match[1]) : null;
}

async function currentUserId(): Promise<string> {
  return (await ensureGuestSession()).user.id;
}

/** The user's Bag, in the order items were added. */
export async function listCart(): Promise<CartItem[]> {
  const userId = await currentUserId();
  const { data, error } = await getSupabaseClient()
    .from("cart_items")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at")
    .order("id")
    .overrideTypes<CartRow[], { merge: false }>();
  if (error) throw new CartError("load your bag", error);
  return data.map(toCartItem);
}

/** Friendlier message for the "size doesn't exist for this product" foreign-key error. */
function addError(error: { message: string; code?: string }) {
  return new CartError(
    "add to your bag",
    error.code === "23503" ? { message: "this size isn’t available for this product", code: error.code } : error,
  );
}

async function incrementPlainItem(userId: string, productId: string, sizeUK: number, quantity: number) {
  const client = getSupabaseClient();
  const { data: existing, error: findError } = await client
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("size_uk", sizeUK)
    .is("customization", null)
    .maybeSingle()
    .overrideTypes<{ id: string; quantity: number } | null, { merge: false }>();
  if (findError) throw new CartError("add to your bag", findError);
  if (!existing) return false;
  const { error } = await client
    .from("cart_items")
    .update({ quantity: existing.quantity + quantity })
    .eq("user_id", userId)
    .eq("id", existing.id);
  if (error) throw new CartError("add to your bag", error);
  return true;
}

/**
 * Adds an item, as V1 did: a plain item with the same product + size adds to
 * that row's quantity; a customised item is always its own row.
 */
export async function addCartItem(item: Pick<CartItem, "productId" | "size" | "quantity" | "customization">) {
  const sizeUK = parseSizeUK(item.size);
  if (sizeUK === null) throw new CartError("add to your bag", { message: `"${item.size}" isn’t a UK size` });
  if (item.quantity < 1) throw new CartError("add to your bag", { message: "quantity must be at least 1" });
  const userId = await currentUserId();
  const customization = item.customization && Object.keys(item.customization).length > 0 ? item.customization : null;

  if (!customization && (await incrementPlainItem(userId, item.productId, sizeUK, item.quantity))) return;

  const { error } = await getSupabaseClient().from("cart_items").insert({
    user_id: userId,
    product_id: item.productId,
    size_uk: sizeUK,
    quantity: item.quantity,
    customization,
  });
  if (!error) return;
  // Another tab added the same plain item a moment ago: add to it instead.
  if (error.code === "23505" && !customization && (await incrementPlainItem(userId, item.productId, sizeUK, item.quantity))) {
    return;
  }
  throw addError(error);
}

async function updateRows(action: string, values: Record<string, unknown>, ids: string[] | "all") {
  const userId = await currentUserId();
  let query = getSupabaseClient().from("cart_items").update(values).eq("user_id", userId);
  if (ids !== "all") query = query.in("id", ids);
  const { error } = await query;
  if (error) throw new CartError(action, error);
}

export async function setCartQuantity(id: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new CartError("change the quantity", { message: "quantity must be at least 1" });
  }
  await updateRows("change the quantity", { quantity }, [id]);
}

export async function setCartSelected(id: string, selected: boolean) {
  await updateRows("update your selection", { is_selected: selected }, [id]);
}

/** Selects or deselects every item in the user's Bag. */
export async function setAllCartSelected(selected: boolean) {
  await updateRows("update your selection", { is_selected: selected }, "all");
}

export async function removeCartItems(ids: string[]) {
  if (ids.length === 0) return;
  const userId = await currentUserId();
  const { error } = await getSupabaseClient().from("cart_items").delete().eq("user_id", userId).in("id", ids);
  if (error) throw new CartError("remove from your bag", error);
}

// ---------------------------------------------------------------------------
// One-time move of a V1 device-only Bag into Supabase
// ---------------------------------------------------------------------------

/** V1 kept the Bag in localStorage under this key (zustand persist). */
const LEGACY_KEY = "cs-bag";
/** V1 items that can't exist in Supabase (unknown product/size/customisation), kept aside, never uploaded. */
const UNMIGRATED_KEY = "cs-bag-unmigrated";

function readLegacyItems(): CartItem[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    const items = raw ? JSON.parse(raw)?.state?.items : null;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function writeLegacyItems(items: CartItem[]) {
  if (items.length === 0) localStorage.removeItem(LEGACY_KEY);
  else localStorage.setItem(LEGACY_KEY, JSON.stringify({ state: { items }, version: 0 }));
}

function keepUnmigrated(item: CartItem) {
  try {
    const raw = localStorage.getItem(UNMIGRATED_KEY);
    const kept: CartItem[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(UNMIGRATED_KEY, JSON.stringify([...kept, item]));
  } catch {
    // Storage full or blocked: the item simply isn't kept aside.
  }
}

/** Customisations must name parts and colours of that product's customiser. */
async function customizationIsValid(item: CartItem, configs: Map<string, Awaited<ReturnType<typeof getCustomizationConfig>>>) {
  if (!item.customization || Object.keys(item.customization).length === 0) return true;
  if (!configs.has(item.productId)) configs.set(item.productId, await getCustomizationConfig(item.productId));
  const config = configs.get(item.productId);
  if (!config) return false;
  return Object.entries(item.customization).every(
    ([part, colour]) => config.parts.some((p) => p.id === part) && config.colours.some((c) => c.id === colour),
  );
}

async function migrateLegacyBagUnlocked(): Promise<void> {
  const configs = new Map<string, Awaited<ReturnType<typeof getCustomizationConfig>>>();
  let remaining = readLegacyItems();
  while (remaining.length > 0) {
    const [item, ...rest] = remaining;
    const valid =
      typeof item?.productId === "string" &&
      typeof item.size === "string" &&
      parseSizeUK(item.size) !== null &&
      Number.isInteger(item.quantity) &&
      item.quantity >= 1 &&
      (await customizationIsValid(item, configs));
    if (valid) {
      try {
        await addCartItem(item);
        // Keep V1's unticked checkbox: the new/merged row is the last one for this item.
        if (item.selected === false) await deselectMigratedItem(item);
      } catch (error) {
        // Unknown product or size for this product: it can't be in Supabase.
        if (!(error instanceof CartError && error.code === "23503")) throw error;
        keepUnmigrated(item);
      }
    } else {
      keepUnmigrated(item);
    }
    // Written after each item, so a retry never uploads an item twice.
    remaining = rest;
    writeLegacyItems(remaining);
  }
}

async function deselectMigratedItem(item: CartItem) {
  const userId = await currentUserId();
  const sizeUK = parseSizeUK(item.size);
  let query = getSupabaseClient()
    .from("cart_items")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", item.productId)
    .eq("size_uk", sizeUK)
    .order("created_at", { ascending: false })
    .limit(1);
  query = item.customization ? query.not("customization", "is", null) : query.is("customization", null);
  const { data, error } = await query.overrideTypes<{ id: string }[], { merge: false }>();
  if (error) throw new CartError("move your saved bag", error);
  if (data[0]) await setCartSelected(data[0].id, false);
}

/**
 * Moves a V1 Bag saved on this device into Supabase, once. Valid items are
 * added (merging like any add); items that can't exist in Supabase are kept
 * aside on the device, not uploaded. Each item is removed from the device copy
 * as soon as it is handled, so running this again never duplicates items. A
 * browser lock stops two tabs migrating at the same time.
 */
export async function migrateLegacyBag(): Promise<void> {
  if (readLegacyItems().length === 0) {
    localStorage.removeItem(LEGACY_KEY);
    return;
  }
  if (typeof navigator !== "undefined" && navigator.locks) {
    await navigator.locks.request("cs-bag-migration", () => migrateLegacyBagUnlocked());
  } else {
    await migrateLegacyBagUnlocked();
  }
}
