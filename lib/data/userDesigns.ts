import { currentDesignProblem } from "@/lib/data/designCheck";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ensureGuestSession } from "@/lib/supabase/guestSession";
import type { CustomizationSelection, SavedDesign } from "@/lib/types";

/*
 * The current (anonymous guest) user's saved designs in Supabase
 * (public.saved_designs, 024_saved_designs.sql). Every call first waits for the
 * guest session; rows are written with that session's user id and RLS only
 * returns the user's own rows. A design is saved only if it fits the shoe's
 * customiser as it is now (the same rule as the Bag and place_order(); see
 * currentDesignProblem). Errors are thrown as-is — never replaced with local data.
 *
 * Mapping to the app's SavedDesign:
 *   id ↔ id (uuid) · product_id ↔ productId · name ↔ name · customization ↔ customization
 *   created_at ↔ createdAt · updated_at ↔ updatedAt
 */

interface DesignRow {
  id: string;
  product_id: string;
  name: string | null;
  customization: CustomizationSelection;
  created_at: string;
  updated_at: string;
}

const COLUMNS = "id, product_id, name, customization, created_at, updated_at";

/** Longest design name (the database enforces the same limit). */
export const MAX_DESIGN_NAME_LENGTH = 60;

/** What the customer is told when a design has no colour chosen (the database refuses an empty one). */
export const EMPTY_DESIGN_MESSAGE = "choose a colour for at least one part";

const NOT_FOUND = { message: "that design no longer exists" };

export class DesignError extends Error {
  /** Postgres/PostgREST error code, when there is one. */
  code?: string;
  constructor(action: string, cause: { message: string; code?: string }) {
    super(`Could not ${action}: ${cause.message}`, { cause });
    this.name = "DesignError";
    this.code = cause.code;
  }
}

const toDesign = (row: DesignRow): SavedDesign => ({
  id: row.id,
  productId: row.product_id,
  name: row.name,
  customization: row.customization,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

async function currentUserId(): Promise<string> {
  return (await ensureGuestSession()).user.id;
}

/** Database errors in the customer's terms, where there is a clearer way to say them. */
function friendly(error: { message: string; code?: string }) {
  // 23503: the product isn't in the catalogue (foreign key).
  if (error.code === "23503") return { message: "that shoe isn’t in the catalogue", code: error.code };
  // 23514: a check failed (empty or malformed design, or a bad name).
  if (error.code === "23514") return { message: "that design couldn’t be saved as it is", code: error.code };
  return error;
}

/** True for an id PostgREST can't read as a uuid (22P02): no design can have it. */
const isMalformedId = (error: { code?: string }) => error.code === "22P02";

/**
 * A name as it's stored: trimmed, null when blank. Throws if it's too long.
 * `undefined` (not given) stays undefined, so an update leaves the name alone.
 */
function normaliseName(action: string, name: string | null | undefined): string | null | undefined {
  if (name === undefined || name === null) return name;
  const trimmed = name.trim();
  if (trimmed === "") return null;
  if (trimmed.length > MAX_DESIGN_NAME_LENGTH) {
    throw new DesignError(action, { message: `a design name can be at most ${MAX_DESIGN_NAME_LENGTH} characters` });
  }
  return trimmed;
}

/** Refuses an empty design, or one that doesn't fit the shoe's customiser as it is now. */
async function assertDesignSavable(action: string, productId: string, customization: CustomizationSelection) {
  if (Object.keys(customization).length === 0) throw new DesignError(action, { message: EMPTY_DESIGN_MESSAGE });
  const problem = await currentDesignProblem(productId, customization);
  if (problem) throw new DesignError(action, { message: problem });
}

/** The user's designs, most recently changed first. */
export async function listDesigns(): Promise<SavedDesign[]> {
  const userId = await currentUserId();
  const { data, error } = await getSupabaseClient()
    .from("saved_designs")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .order("id")
    .overrideTypes<DesignRow[], { merge: false }>();
  if (error) throw new DesignError("load your designs", error);
  return data.map(toDesign);
}

/**
 * One of the user's designs, or null when there's no such design for them
 * (never saved, deleted, someone else's, or not a valid id at all — e.g. a
 * mistyped link).
 */
export async function getDesign(id: string): Promise<SavedDesign | null> {
  const userId = await currentUserId();
  const { data, error } = await getSupabaseClient()
    .from("saved_designs")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<DesignRow | null, { merge: false }>();
  if (error) {
    if (isMalformedId(error)) return null;
    throw new DesignError("load your design", error);
  }
  return data ? toDesign(data) : null;
}

/**
 * Saves a new design for `productId`. It must have at least one colour and fit
 * the shoe's customiser as it is now. Returns the saved design.
 */
export async function createDesign(design: {
  productId: string;
  customization: CustomizationSelection;
  name?: string | null;
}): Promise<SavedDesign> {
  const action = "save your design";
  const name = normaliseName(action, design.name) ?? null;
  await assertDesignSavable(action, design.productId, design.customization);
  const userId = await currentUserId();
  const { data, error } = await getSupabaseClient()
    .from("saved_designs")
    .insert({ user_id: userId, product_id: design.productId, name, customization: design.customization })
    .select(COLUMNS)
    .single()
    .overrideTypes<DesignRow, { merge: false }>();
  if (error) throw new DesignError(action, friendly(error));
  return toDesign(data);
}

/**
 * Changes one of the user's designs: its colours, its name, or both (a field
 * left out stays as it is; `name: null` or blank clears the name). New colours
 * must fit the design's shoe as it is now. Returns the design as saved.
 */
export async function updateDesign(
  id: string,
  changes: { customization?: CustomizationSelection; name?: string | null },
): Promise<SavedDesign> {
  const action = "update your design";
  const name = normaliseName(action, changes.name);
  const values: { customization?: CustomizationSelection; name?: string | null } = {};
  if (name !== undefined) values.name = name;
  if (changes.customization !== undefined) {
    // The shoe comes from the saved row itself, so check against that shoe's customiser.
    const current = await getDesign(id);
    if (!current) throw new DesignError(action, NOT_FOUND);
    await assertDesignSavable(action, current.productId, changes.customization);
    values.customization = changes.customization;
  }
  if (Object.keys(values).length === 0) {
    const current = await getDesign(id);
    if (!current) throw new DesignError(action, NOT_FOUND);
    return current;
  }

  const userId = await currentUserId();
  const { data, error } = await getSupabaseClient()
    .from("saved_designs")
    .update(values)
    .eq("user_id", userId)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle()
    .overrideTypes<DesignRow | null, { merge: false }>();
  if (error) throw new DesignError(action, isMalformedId(error) ? NOT_FOUND : friendly(error));
  if (!data) throw new DesignError(action, NOT_FOUND);
  return toDesign(data);
}

/** Deletes one of the user's designs. Deleting one that's already gone is not an error. */
export async function deleteDesign(id: string): Promise<void> {
  const userId = await currentUserId();
  const { error } = await getSupabaseClient().from("saved_designs").delete().eq("user_id", userId).eq("id", id);
  if (error && !isMalformedId(error)) throw new DesignError("delete your design", error);
}
