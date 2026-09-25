import { getAdminSupabaseClient } from "@/lib/supabase/client";
import type { ViewerAngle } from "@/lib/types";
import { imagePathError } from "@/lib/validation/imagePath";

/*
 * Customiser configurations for the admin, read from public.customization_configs
 * with its parts and colours counted in the same query. Only products that
 * actually have a configuration row appear — nothing is inferred from the
 * products table's is_customizable flag alone.
 */

export interface AdminCustomizer {
  productId: string;
  /** From public.products, so the list shows the catalogue name and URL slug. */
  productName: string;
  productSlug: string;
  /** The customiser's own title and category (customization_configs). */
  title: string;
  displayCategory: string;
  partCount: number;
  colourCount: number;
}

interface CountRow {
  count: number;
}

interface AdminCustomizerRow {
  product_id: string;
  title: string;
  display_category: string;
  customization_parts: CountRow[];
  customization_colours: CountRow[];
  product: { name: string; slug: string } | null;
}

export class AdminCustomizerError extends Error {
  constructor(action: string, cause: { message: string }) {
    super(`Could not ${action}: ${cause.message}`, { cause });
    this.name = "AdminCustomizerError";
  }
}

const countOf = (rows: CountRow[]) => rows[0]?.count ?? 0;

/** Every product that has a customiser configuration, with its part and colour counts. */
export async function loadAdminCustomizers(): Promise<AdminCustomizer[]> {
  const { data, error } = await getAdminSupabaseClient()
    .from("customization_configs")
    .select(
      "product_id, title, display_category, " +
        "customization_parts(count), customization_colours(count), " +
        "product:products(name, slug)",
    )
    .order("product_id")
    .overrideTypes<AdminCustomizerRow[], { merge: false }>();
  if (error) throw new AdminCustomizerError("load the customisers", error);

  return data.map((row) => ({
    productId: row.product_id,
    productName: row.product?.name ?? row.product_id,
    productSlug: row.product?.slug ?? row.product_id,
    title: row.title,
    displayCategory: row.display_category,
    partCount: countOf(row.customization_parts),
    colourCount: countOf(row.customization_colours),
  }));
}

// ---------------------------------------------------------------------------
// One customiser, in full
// ---------------------------------------------------------------------------

export interface AdminCustomizerPart {
  id: string;
  name: string;
  sortOrder: number;
}

export interface AdminCustomizerColour {
  id: string;
  name: string;
  hex: string;
  sortOrder: number;
}

/**
 * A product's whole customiser. Colours are stored per product
 * (public.customization_colours has no part column), so every part offers
 * this same set — that is how the customiser screen works.
 */
export interface AdminCustomizerDetail {
  productId: string;
  productName: string;
  productSlug: string;
  title: string;
  displayCategory: string;
  wordmark: string;
  imageUrl: string;
  angles: ViewerAngle[];
  parts: AdminCustomizerPart[];
  colours: AdminCustomizerColour[];
}

interface AdminCustomizerDetailRow {
  product_id: string;
  title: string;
  display_category: string;
  wordmark: string;
  image_url: string;
  angles: ViewerAngle[];
  customization_parts: { id: string; name: string; sort_order: number }[];
  customization_colours: { id: string; name: string; hex: string; sort_order: number }[];
  product: { name: string; slug: string } | null;
}

const bySortOrder = <T extends { sort_order: number }>(rows: T[]) =>
  [...rows].sort((a, b) => a.sort_order - b.sort_order);

/** One product's customiser with its parts and colours; null if it has none. */
export async function getAdminCustomizer(productId: string): Promise<AdminCustomizerDetail | null> {
  const { data, error } = await getAdminSupabaseClient()
    .from("customization_configs")
    .select(
      "product_id, title, display_category, wordmark, image_url, angles, " +
        "customization_parts(id, name, sort_order), " +
        "customization_colours(id, name, hex, sort_order), " +
        "product:products(name, slug)",
    )
    .eq("product_id", productId)
    .maybeSingle()
    .overrideTypes<AdminCustomizerDetailRow | null, { merge: false }>();
  if (error) throw new AdminCustomizerError(`load the customiser for "${productId}"`, error);
  if (!data) return null;

  return {
    productId: data.product_id,
    productName: data.product?.name ?? data.product_id,
    productSlug: data.product?.slug ?? data.product_id,
    title: data.title,
    displayCategory: data.display_category,
    wordmark: data.wordmark,
    imageUrl: data.image_url,
    angles: data.angles,
    parts: bySortOrder(data.customization_parts).map(({ id, name, sort_order }) => ({
      id,
      name,
      sortOrder: sort_order,
    })),
    colours: bySortOrder(data.customization_colours).map(({ id, name, hex, sort_order }) => ({
      id,
      name,
      hex,
      sortOrder: sort_order,
    })),
  };
}

// ---------------------------------------------------------------------------
// Admin edits
// ---------------------------------------------------------------------------

/*
 * Saving a customiser is several requests, because PostgREST has no
 * transaction: the configuration row, then deletes, then the parts and colours.
 *
 * Two constraints from 001 shape the order they run in:
 *   - (product_id, sort_order) is unique per table, and the constraint is not
 *     deferrable, so re-ordering rows one request at a time would collide
 *     halfway through. Every kept row is therefore first parked at a
 *     sort_order far above the real ones, and only then given its final value.
 *   - Parts and colours are identified by (product_id, id). Existing ids are
 *     never rewritten; a new row brings its own id.
 *
 * Deleting is safe for order history: public.order_item_customizations copies
 * the part and colour names into the order and has no foreign key back here.
 * A customer's *bag* is different — cart_items.customization stores part and
 * colour ids, and place_order() rejects an item whose ids no longer exist, so
 * the editor warns before deleting.
 */

export interface AdminCustomizerPartEdit extends AdminCustomizerPart {
  /** True for a row the admin just added (its id can still be edited); saving decides insert vs update from the database. */
  isNew: boolean;
}

export interface AdminCustomizerColourEdit extends AdminCustomizerColour {
  isNew: boolean;
}

export interface AdminCustomizerEdit {
  title: string;
  displayCategory: string;
  wordmark: string;
  imageUrl: string;
  parts: AdminCustomizerPartEdit[];
  colours: AdminCustomizerColourEdit[];
  /** Ids of existing parts/colours to remove. */
  removedPartIds: string[];
  removedColourIds: string[];
}

const REFUSED =
  "the database refused the change. Only an admin account can edit the customiser.";

function refusal(action: string): AdminCustomizerError {
  return new AdminCustomizerError(action, { message: REFUSED });
}

type CustomizerTable = "customization_parts" | "customization_colours";

/**
 * Rows of one kind, as they should end up in the database. Whether a row is
 * inserted or updated is decided from what the database holds when the save
 * runs, not from the editor's `isNew` — after a failed save the two can differ.
 */
interface RowEdit {
  id: string;
  sortOrder: number;
  values: Record<string, string | number>;
}

const partRows = (parts: AdminCustomizerPartEdit[]): RowEdit[] =>
  parts.map((part) => ({
    id: part.id,
    sortOrder: part.sortOrder,
    values: { name: part.name },
  }));

const colourRows = (colours: AdminCustomizerColourEdit[]): RowEdit[] =>
  colours.map((colour) => ({
    id: colour.id,
    sortOrder: colour.sortOrder,
    values: { name: colour.name, hex: colour.hex },
  }));

/** One row's update; throws when row level security let nothing through. */
async function patchRow(
  table: CustomizerTable,
  productId: string,
  id: string,
  patch: Record<string, string | number>,
  action: string,
): Promise<void> {
  const { data, error } = await getAdminSupabaseClient()
    .from(table)
    .update(patch)
    .eq("product_id", productId)
    .eq("id", id)
    .select("id");
  if (error) throw new AdminCustomizerError(action, error);
  if (!data || data.length === 0) throw refusal(action);
}

/**
 * Brings one table's rows to what the admin asked for: removals, then the
 * re-order, then the inserts, then the final values.
 *
 * Retry-safe: every step starts from the rows the database holds now, not
 * from the editor's copy, so a save that failed part-way (some rows already
 * removed, parked, added or updated) can simply be run again and finishes the
 * job instead of repeating it — an already-removed row isn't removed again, an
 * already-added row is updated instead of inserted twice, and parked rows go
 * to their final places.
 */
async function saveRows(
  table: CustomizerTable,
  productId: string,
  rows: RowEdit[],
  removedIds: string[],
  label: string,
): Promise<void> {
  const client = getAdminSupabaseClient();

  // What's there now (parts and colours are publicly readable).
  const { data: current, error: readError } = await client
    .from(table)
    .select("id, sort_order")
    .eq("product_id", productId)
    .overrideTypes<{ id: string; sort_order: number }[], { merge: false }>();
  if (readError) throw new AdminCustomizerError(`read ${label}`, readError);
  const inDb = new Map(current.map((row) => [row.id, row.sort_order]));

  // Removals: only rows still there (an earlier attempt may have removed some).
  // Rows that are there but don't go means the admin-only policy refused.
  const toRemove = removedIds.filter((id) => inDb.has(id));
  if (toRemove.length > 0) {
    const { data, error } = await client
      .from(table)
      .delete()
      .eq("product_id", productId)
      .in("id", toRemove)
      .select("id");
    if (error) throw new AdminCustomizerError(`remove ${label}`, error);
    if (!data || data.length === 0) throw refusal(`remove ${label}`);
    for (const id of toRemove) inDb.delete(id);
  }

  // Rows already in the database are updated; the rest are inserted.
  const kept = rows.filter((row) => inDb.has(row.id));
  const added = rows.filter((row) => !inDb.has(row.id));
  const moving = kept.filter((row) => inDb.get(row.id) !== row.sortOrder);

  // Park every row that changes place above everything in use (now or wanted),
  // so no two rows ever share a sort_order while the final values are written
  // one request at a time. Parked rows left behind by a failed attempt are
  // simply parked again, higher up, and then put in place.
  if (moving.length > 0) {
    const inUse = [...inDb.values(), ...rows.map((row) => row.sortOrder)];
    const parkFrom = Math.max(0, ...inUse) + 1;
    for (const [index, row] of moving.entries()) {
      await patchRow(table, productId, row.id, { sort_order: parkFrom + index }, `re-order ${label}`);
    }
  }

  if (added.length > 0) {
    const { data, error } = await client
      .from(table)
      .insert(
        added.map((row) => ({
          product_id: productId,
          id: row.id,
          sort_order: row.sortOrder,
          ...row.values,
        })),
      )
      .select("id");
    if (error) throw new AdminCustomizerError(`add ${label}`, error);
    if (!data || data.length === 0) throw refusal(`add ${label}`);
  }

  for (const row of kept) {
    const patch: Record<string, string | number> = { ...row.values };
    if (moving.includes(row)) patch.sort_order = row.sortOrder;
    await patchRow(table, productId, row.id, patch, `save ${label}`);
  }
}

/**
 * Saves the configuration, its parts and its colours, and returns the
 * customiser as it now stands in the database. Safe to run again after it
 * failed part-way: each step works from the database's current rows (see
 * saveRows), so a retry completes the save rather than repeating it.
 *
 * Every request is checked for the empty result an admin-only policy gives a
 * non-admin (PostgREST answers 200 with no rows rather than an error), so a
 * refusal is reported instead of passing silently.
 */
export async function updateAdminCustomizer(
  productId: string,
  edit: AdminCustomizerEdit,
): Promise<AdminCustomizerDetail> {
  // Only a local image path is saved: anything else would break next/image on the storefront.
  const imageProblem = imagePathError(edit.imageUrl.trim());
  if (imageProblem) throw new AdminCustomizerError("save the configuration", { message: imageProblem });

  const client = getAdminSupabaseClient();

  const { data, error } = await client
    .from("customization_configs")
    .update({
      title: edit.title,
      display_category: edit.displayCategory,
      wordmark: edit.wordmark,
      image_url: edit.imageUrl.trim(),
    })
    .eq("product_id", productId)
    .select("product_id")
    .maybeSingle();
  if (error) throw new AdminCustomizerError("save the configuration", error);
  if (!data) throw refusal("save the configuration");

  await saveRows("customization_parts", productId, partRows(edit.parts), edit.removedPartIds, "the parts");
  await saveRows("customization_colours", productId, colourRows(edit.colours), edit.removedColourIds, "the colours");

  const saved = await getAdminCustomizer(productId);
  if (!saved) throw new AdminCustomizerError("re-read the customiser", { message: "it is no longer there" });
  return saved;
}
