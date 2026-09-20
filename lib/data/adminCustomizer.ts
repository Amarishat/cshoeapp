import { getSupabaseClient } from "@/lib/supabase/client";
import type { ViewerAngle } from "@/lib/types";

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
  const { data, error } = await getSupabaseClient()
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
  const { data, error } = await getSupabaseClient()
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

/** Where kept rows are parked while they are being re-ordered. */
const SORT_OFFSET = 1000;

export interface AdminCustomizerPartEdit extends AdminCustomizerPart {
  /** True for a row the admin just added, which is inserted rather than updated. */
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

/** Rows of one kind, as they should end up in the database. */
interface RowEdit {
  id: string;
  isNew: boolean;
  sortOrder: number;
  values: Record<string, string | number>;
}

const partRows = (parts: AdminCustomizerPartEdit[]): RowEdit[] =>
  parts.map((part) => ({
    id: part.id,
    isNew: part.isNew,
    sortOrder: part.sortOrder,
    values: { name: part.name },
  }));

const colourRows = (colours: AdminCustomizerColourEdit[]): RowEdit[] =>
  colours.map((colour) => ({
    id: colour.id,
    isNew: colour.isNew,
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
  const { data, error } = await getSupabaseClient()
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
 * re-order dance, then the inserts, then the final values.
 */
async function saveRows(
  table: CustomizerTable,
  productId: string,
  rows: RowEdit[],
  removedIds: string[],
  stored: { id: string; sortOrder: number }[],
  label: string,
): Promise<void> {
  const client = getSupabaseClient();

  if (removedIds.length > 0) {
    const { data, error } = await client
      .from(table)
      .delete()
      .eq("product_id", productId)
      .in("id", removedIds)
      .select("id");
    if (error) throw new AdminCustomizerError(`remove ${label}`, error);
    if (!data || data.length === 0) throw refusal(`remove ${label}`);
  }

  const kept = rows.filter((row) => !row.isNew);
  const storedSort = new Map(stored.map((row) => [row.id, row.sortOrder]));
  const reordering = kept.some((row) => storedSort.get(row.id) !== row.sortOrder);

  // Park every kept row above the real range so no two rows ever share a
  // sort_order while the final values are being written one request at a time.
  if (reordering) {
    for (const [index, row] of kept.entries()) {
      await patchRow(table, productId, row.id, { sort_order: SORT_OFFSET + index }, `re-order ${label}`);
    }
  }

  const added = rows.filter((row) => row.isNew);
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
    if (reordering) patch.sort_order = row.sortOrder;
    await patchRow(table, productId, row.id, patch, `save ${label}`);
  }
}

/**
 * Saves the configuration, its parts and its colours, and returns the
 * customiser as it now stands in the database.
 *
 * Every request is checked for the empty result an admin-only policy gives a
 * non-admin (PostgREST answers 200 with no rows rather than an error), so a
 * refusal is reported instead of passing silently.
 */
export async function updateAdminCustomizer(
  productId: string,
  edit: AdminCustomizerEdit,
  stored: Pick<AdminCustomizerDetail, "parts" | "colours">,
): Promise<AdminCustomizerDetail> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("customization_configs")
    .update({
      title: edit.title,
      display_category: edit.displayCategory,
      wordmark: edit.wordmark,
      image_url: edit.imageUrl,
    })
    .eq("product_id", productId)
    .select("product_id")
    .maybeSingle();
  if (error) throw new AdminCustomizerError("save the configuration", error);
  if (!data) throw refusal("save the configuration");

  await saveRows("customization_parts", productId, partRows(edit.parts), edit.removedPartIds, stored.parts, "the parts");
  await saveRows(
    "customization_colours",
    productId,
    colourRows(edit.colours),
    edit.removedColourIds,
    stored.colours,
    "the colours",
  );

  const saved = await getAdminCustomizer(productId);
  if (!saved) throw new AdminCustomizerError("re-read the customiser", { message: "it is no longer there" });
  return saved;
}
