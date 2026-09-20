import { getSupabaseClient } from "@/lib/supabase/client";
import type { Audience, GalleryImage, Rect } from "@/lib/types";

/*
 * Admin edits to public.products. Reads and writes go through the same
 * Supabase browser client as the rest of the app with the admin's own
 * session; the admin-only policies (006) decide whether an update is allowed,
 * so a customer or guest session simply gets an error back.
 *
 * Only the scalar fields the admin screen offers are read or written here —
 * slug, brand, images, sizes, reviews and the customiser are untouched.
 */

/** The fields the product editor can change. */
export interface AdminProductEdit {
  name: string;
  /** MRP in whole rupees. */
  price: number;
  audience: Audience;
  /** Display-only label, e.g. "10% OFF"; empty means no label. */
  discountLabel: string;
  isCustomizable: boolean;
  hasProductPage: boolean;
}

/** An editable product, with the read-only context the form shows. */
export interface AdminProduct extends AdminProductEdit {
  id: string;
  slug: string;
  brandName: string;
}

interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  price: number;
  audience: Audience;
  discount_label: string | null;
  is_customizable: boolean;
  has_product_page: boolean;
  brand: { name: string } | null;
}

const COLUMNS = "id, slug, name, price, audience, discount_label, is_customizable, has_product_page, brand:brands(name)";

export class AdminProductError extends Error {
  /** Postgres/PostgREST error code, when there is one. */
  code?: string;
  constructor(action: string, cause: { message: string; code?: string }) {
    super(`Could not ${action}: ${cause.message}`, { cause });
    this.name = "AdminProductError";
    this.code = cause.code;
  }
}

const toProduct = (row: AdminProductRow): AdminProduct => ({
  id: row.id,
  slug: row.slug,
  brandName: row.brand?.name ?? row.id,
  name: row.name,
  price: row.price,
  audience: row.audience,
  discountLabel: row.discount_label ?? "",
  isCustomizable: row.is_customizable,
  hasProductPage: row.has_product_page,
});

/** One product to edit; null if that id isn't in the catalogue. */
export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  const { data, error } = await getSupabaseClient()
    .from("products")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<AdminProductRow | null, { merge: false }>();
  if (error) throw new AdminProductError(`load product "${id}"`, error);
  return data ? toProduct(data) : null;
}

/**
 * Saves the editable fields and returns the product as stored. A session that
 * isn't an admin's is refused by row level security: the update matches no
 * row, which is reported as an error rather than a silent no-op.
 */
export async function updateAdminProduct(id: string, edit: AdminProductEdit): Promise<AdminProduct> {
  const { data, error } = await getSupabaseClient()
    .from("products")
    .update({
      name: edit.name.trim(),
      price: edit.price,
      audience: edit.audience,
      discount_label: edit.discountLabel.trim() || null,
      is_customizable: edit.isCustomizable,
      has_product_page: edit.hasProductPage,
    })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle()
    .overrideTypes<AdminProductRow | null, { merge: false }>();
  if (error) throw new AdminProductError("save the product", error);
  if (!data) {
    throw new AdminProductError("save the product", {
      message: "the change wasn’t applied — the product is gone, or this account can’t edit the catalogue",
    });
  }
  return toProduct(data);
}

// ---------------------------------------------------------------------------
// Product images (read-only for now)
// ---------------------------------------------------------------------------

/** One row of public.product_images, as the admin lists it. */
export interface AdminProductImage {
  id: string;
  src: string;
  alt: string;
  kind: GalleryImage["kind"];
  /** Placement inside the gallery tile, when the image has one. */
  box: Rect | null;
  sortOrder: number;
}

interface AdminProductImageRow {
  id: string;
  src: string;
  alt: string;
  kind: GalleryImage["kind"];
  box: Rect | null;
  sort_order: number;
}

/** A product's gallery rows, in gallery order (sort_order 0 is the first slide). */
export async function listAdminProductImages(productId: string): Promise<AdminProductImage[]> {
  const { data, error } = await getSupabaseClient()
    .from("product_images")
    .select("id, src, alt, kind, box, sort_order")
    .eq("product_id", productId)
    .order("sort_order")
    .overrideTypes<AdminProductImageRow[], { merge: false }>();
  if (error) throw new AdminProductError(`load the images for "${productId}"`, error);

  return data.map((row) => ({
    id: row.id,
    src: row.src,
    alt: row.alt,
    kind: row.kind,
    box: row.box,
    sortOrder: row.sort_order,
  }));
}

// ---------------------------------------------------------------------------
// Product sizes (read-only for now)
// ---------------------------------------------------------------------------

/**
 * One row of public.product_sizes. The table holds the UK size, whether it is
 * the size the product page starts on, and the display order — there is no
 * stock or availability column, so none is shown.
 */
export interface AdminProductSize {
  sizeUK: number;
  /** Preselected on the product page. */
  isDefault: boolean;
  sortOrder: number;
}

interface AdminProductSizeRow {
  size_uk: number;
  is_default: boolean;
  sort_order: number;
}

/** A product's sizes in the order the product page lists them (sort_order). */
export async function listAdminProductSizes(productId: string): Promise<AdminProductSize[]> {
  const { data, error } = await getSupabaseClient()
    .from("product_sizes")
    .select("size_uk, is_default, sort_order")
    .eq("product_id", productId)
    .order("sort_order")
    .overrideTypes<AdminProductSizeRow[], { merge: false }>();
  if (error) throw new AdminProductError(`load the sizes for "${productId}"`, error);

  return data.map((row) => ({
    sizeUK: Number(row.size_uk),
    isDefault: row.is_default,
    sortOrder: row.sort_order,
  }));
}

// ---------------------------------------------------------------------------
// Product reviews (read-only for now)
// ---------------------------------------------------------------------------

/**
 * One row of public.product_reviews. The table also has a user_id (the
 * account that wrote the review); it is deliberately not selected or shown —
 * the storefront uses the display name for the same reason. There is no
 * status or moderation column.
 */
export interface AdminProductReview {
  id: string;
  author: string;
  rating: number;
  text: string;
  createdAt: string;
}

interface AdminProductReviewRow {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
}

/** A product's reviews, oldest first — the order the product page shows them in. */
export async function listAdminProductReviews(productId: string): Promise<AdminProductReview[]> {
  const { data, error } = await getSupabaseClient()
    .from("product_reviews")
    .select("id, author_name, rating, body, created_at")
    .eq("product_id", productId)
    .order("created_at")
    .order("id")
    .overrideTypes<AdminProductReviewRow[], { merge: false }>();
  if (error) throw new AdminProductError(`load the reviews for "${productId}"`, error);

  return data.map((row) => ({
    id: row.id,
    author: row.author_name,
    rating: row.rating,
    text: row.body,
    createdAt: row.created_at,
  }));
}
