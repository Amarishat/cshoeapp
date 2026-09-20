import { getSupabaseClient } from "@/lib/supabase/client";

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
