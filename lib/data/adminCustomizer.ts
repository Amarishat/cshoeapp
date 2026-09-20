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
