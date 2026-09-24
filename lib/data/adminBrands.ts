import { getBrands, getProducts } from "@/lib/data/supabaseCatalog";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

/*
 * Brands for the admin, read with the same catalogue queries the storefront
 * uses. public.brands has no separate slug column — the id is the slug (it is
 * the /brands/[brand] URL segment, and the table constrains it to slug form).
 * Product counts are worked out from the products already loaded, so this
 * adds no new kind of database query and no schema change.
 */

export interface AdminBrand {
  /** Primary key, and the slug used in /brands/[brand]. */
  id: string;
  name: string;
  logoUrl: string;
  /** How many catalogue products name this brand. */
  productCount: number;
}

/** Every brand in brand-row order (sort_order), with its product count. */
export async function loadAdminBrands(): Promise<AdminBrand[]> {
  const [brands, products] = await Promise.all([getBrands(), getProducts()]);

  const counts = new Map<string, number>();
  for (const product of products) {
    counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
  }

  return brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    logoUrl: brand.logo,
    productCount: counts.get(brand.id) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Editing one brand
// ---------------------------------------------------------------------------

/**
 * The fields the brand editor can change. The id is the slug and is not
 * editable: products reference it and it is the /brands/[brand] URL.
 */
export interface AdminBrandEdit {
  name: string;
  logoUrl: string;
  /** Figma logo box in px; numeric(5,2), so halves like 14.43 are allowed. */
  logoWidth: number;
  logoHeight: number;
  /** Position in the brand rows (smallint). */
  sortOrder: number;
}

export interface AdminBrandDetail extends AdminBrandEdit {
  id: string;
}

interface AdminBrandRow {
  id: string;
  name: string;
  logo_url: string;
  logo_width: number;
  logo_height: number;
  sort_order: number;
}

const BRAND_COLUMNS = "id, name, logo_url, logo_width, logo_height, sort_order";

export class AdminBrandError extends Error {
  code?: string;
  constructor(action: string, cause: { message: string; code?: string }) {
    super(`Could not ${action}: ${cause.message}`, { cause });
    this.name = "AdminBrandError";
    this.code = cause.code;
  }
}

const toBrand = (row: AdminBrandRow): AdminBrandDetail => ({
  id: row.id,
  name: row.name,
  logoUrl: row.logo_url,
  logoWidth: Number(row.logo_width),
  logoHeight: Number(row.logo_height),
  sortOrder: row.sort_order,
});

/** One brand to edit; null if that id isn't in the catalogue. */
export async function getAdminBrand(id: string): Promise<AdminBrandDetail | null> {
  const { data, error } = await getAdminSupabaseClient()
    .from("brands")
    .select(BRAND_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<AdminBrandRow | null, { merge: false }>();
  if (error) throw new AdminBrandError(`load brand "${id}"`, error);
  return data ? toBrand(data) : null;
}

/**
 * Saves the editable fields and returns the brand as stored. A session that
 * isn't an admin's is refused by row level security: the update matches no
 * row, which is reported as an error rather than a silent no-op.
 */
export async function updateAdminBrand(id: string, edit: AdminBrandEdit): Promise<AdminBrandDetail> {
  const { data, error } = await getAdminSupabaseClient()
    .from("brands")
    .update({
      name: edit.name.trim(),
      logo_url: edit.logoUrl.trim(),
      logo_width: edit.logoWidth,
      logo_height: edit.logoHeight,
      sort_order: edit.sortOrder,
    })
    .eq("id", id)
    .select(BRAND_COLUMNS)
    .maybeSingle()
    .overrideTypes<AdminBrandRow | null, { merge: false }>();
  if (error) throw new AdminBrandError("save the brand", error);
  if (!data) {
    throw new AdminBrandError("save the brand", {
      message: "the change wasn’t applied — the brand is gone, or this account can’t edit brands",
    });
  }
  return toBrand(data);
}
