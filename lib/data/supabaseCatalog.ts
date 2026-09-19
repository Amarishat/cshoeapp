import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  Audience,
  Brand,
  CardImage,
  CustomizationConfig,
  GalleryImage,
  ListImage,
  Product,
  Rect,
  Review,
  ViewerAngle,
} from "@/lib/types";

/*
 * Read-only catalogue queries against Supabase (tables from
 * supabase/migrations/001_initial_schema.sql, seeded by 003). Results are
 * mapped onto the app's existing types where they fit. Any Supabase error is
 * thrown as a CatalogueError — never replaced with mock data.
 *
 * Used by Home, Shop (+ Filters), Brand pages and the product page; other
 * screens still read the mock data files.
 */

export class CatalogueError extends Error {
  constructor(what: string, cause: { message: string; code?: string }) {
    super(`Could not load ${what} from Supabase: ${cause.message}`, { cause });
    this.name = "CatalogueError";
  }
}

// ---------------------------------------------------------------------------
// Row shapes (as returned by PostgREST for the selects below)
// ---------------------------------------------------------------------------

interface BrandRow {
  id: string;
  name: string;
  logo_url: string;
  logo_width: number;
  logo_height: number;
  sort_order: number;
}

interface ProductRow {
  id: string;
  slug: string;
  brand_id: string;
  name: string;
  short_name: string | null;
  category: string;
  audience: Audience;
  price: number;
  discount_label: string | null;
  rating: number;
  description_excerpt: string | null;
  description_rest: string | null;
  details: { label: string; value: string }[] | null;
  card_image: CardImage;
  cutout_url: string | null;
  cutout_frame: Pick<ListImage, "aspect" | "crop"> | null;
  has_product_page: boolean;
  is_customizable: boolean;
  home_sections: string[];
  created_at: string;
  brand: { id: string; name: string } | null;
}

interface ProductImageRow {
  src: string;
  alt: string;
  kind: GalleryImage["kind"];
  box: Rect | null;
  sort_order: number;
}

interface ProductSizeRow {
  size_uk: number;
  is_default: boolean;
  sort_order: number;
}

interface ProductReviewRow {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
}

interface ProductDetailRow extends ProductRow {
  product_images: ProductImageRow[];
  product_sizes: ProductSizeRow[];
  product_reviews: ProductReviewRow[];
}

interface CustomizationConfigRow {
  product_id: string;
  title: string;
  display_category: string;
  wordmark: string;
  image_url: string;
  angles: ViewerAngle[];
  product: {
    slug: string;
    price: number;
    discount_label: string | null;
    product_sizes: ProductSizeRow[];
  } | null;
  customization_parts: { id: string; name: string; sort_order: number }[];
  customization_colours: { id: string; name: string; hex: string; sort_order: number }[];
}

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

/** A catalogue product: the existing `Product` shape plus database extras. */
export interface CatalogueProduct extends Product {
  brandName: string;
  /** Display-only label, e.g. "10% OFF" (never applied to the price). */
  discountLabel: string | null;
  /** True when /products/[slug] exists. */
  hasProductPage: boolean;
  /** Home rails this product appears in, e.g. "top_picks". */
  homeSections: string[];
}

/** One product with everything its product page needs. */
export interface CatalogueProductDetail extends CatalogueProduct {
  shortName: string | null;
  description: { excerpt: string; rest: string } | null;
  details: { label: string; value: string }[];
  /** Transparent cut-out for Bag / order lines (null if the product has none). */
  cutout: string | null;
  cutoutFrame: Pick<ListImage, "aspect" | "crop"> | null;
  gallery: GalleryImage[];
  /** UK/India sizes in display order (empty when the product has no sizes). */
  sizesUK: number[];
  defaultSizeUK: number | null;
  reviews: Review[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRODUCT_COLUMNS =
  "id, slug, brand_id, name, short_name, category, audience, price, discount_label, rating, " +
  "description_excerpt, description_rest, details, card_image, cutout_url, cutout_frame, " +
  "has_product_page, is_customizable, home_sections, created_at, brand:brands(id, name)";

const bySortOrder = <T extends { sort_order: number }>(rows: T[]) =>
  [...rows].sort((a, b) => a.sort_order - b.sort_order);

function toCatalogueProduct(row: ProductRow): CatalogueProduct {
  if (!row.brand) {
    throw new CatalogueError(`product "${row.id}"`, { message: `brand "${row.brand_id}" not found` });
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand.id,
    brandName: row.brand.name,
    category: row.category,
    audience: row.audience,
    price: row.price,
    rating: Number(row.rating),
    image: row.card_image,
    customizable: row.is_customizable,
    discountLabel: row.discount_label,
    hasProductPage: row.has_product_page,
    homeSections: row.home_sections,
  };
}

function sizesOf(rows: ProductSizeRow[]) {
  const sorted = bySortOrder(rows);
  const sizesUK = sorted.map((s) => Number(s.size_uk));
  const flagged = sorted.find((s) => s.is_default);
  return { sizesUK, defaultSizeUK: flagged ? Number(flagged.size_uk) : null };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** All brands, in Home brand-row order. */
export async function getBrands(): Promise<Brand[]> {
  const { data, error } = await getSupabaseClient()
    .from("brands")
    .select("id, name, logo_url, logo_width, logo_height, sort_order")
    .order("sort_order")
    .overrideTypes<BrandRow[], { merge: false }>();
  if (error) throw new CatalogueError("brands", error);

  return data.map((b) => ({
    id: b.id,
    name: b.name,
    logo: b.logo_url,
    logoWidth: Number(b.logo_width),
    logoHeight: Number(b.logo_height),
  }));
}

/**
 * Every catalogue product with its brand. The schema has no display-order
 * column, so rows come back in a stable id order; screens that need Figma
 * order (e.g. Home rails) must order them themselves.
 */
export async function getProducts(): Promise<CatalogueProduct[]> {
  const { data, error } = await getSupabaseClient()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("id")
    .overrideTypes<ProductRow[], { merge: false }>();
  if (error) throw new CatalogueError("products", error);

  return data.map(toCatalogueProduct);
}

/** One product by slug with its brand, gallery, sizes and reviews; null if none. */
export async function getProductBySlug(slug: string): Promise<CatalogueProductDetail | null> {
  const { data, error } = await getSupabaseClient()
    .from("products")
    .select(
      `${PRODUCT_COLUMNS}, ` +
        "product_images(src, alt, kind, box, sort_order), " +
        "product_sizes(size_uk, is_default, sort_order), " +
        "product_reviews(id, author_name, rating, body, created_at)",
    )
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<ProductDetailRow | null, { merge: false }>();
  if (error) throw new CatalogueError(`product "${slug}"`, error);
  if (!data) return null;

  const { sizesUK, defaultSizeUK } = sizesOf(data.product_sizes);
  // Oldest first. There is no review-order column; ties (e.g. reviews seeded
  // together) keep the order the database returns them in.
  const reviews = [...data.product_reviews].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return {
    ...toCatalogueProduct(data),
    shortName: data.short_name,
    description:
      data.description_excerpt !== null
        ? { excerpt: data.description_excerpt, rest: data.description_rest ?? "" }
        : null,
    details: data.details ?? [],
    cutout: data.cutout_url,
    cutoutFrame: data.cutout_frame,
    gallery: bySortOrder(data.product_images).map((img) => ({
      src: img.src,
      alt: img.alt,
      kind: img.kind,
      ...(img.box ? { box: img.box } : {}),
    })),
    sizesUK,
    defaultSizeUK,
    reviews: reviews.map((r) => ({ id: r.id, author: r.author_name, rating: r.rating, text: r.body })),
  };
}

/**
 * The customiser setup for a product, in the existing `CustomizationConfig`
 * shape: price and sizes come from the product, parts and colours in order.
 * Null if the product has no customiser.
 */
export async function getCustomizationConfig(productId: string): Promise<CustomizationConfig | null> {
  const { data, error } = await getSupabaseClient()
    .from("customization_configs")
    .select(
      "product_id, title, display_category, wordmark, image_url, angles, " +
        "product:products(slug, price, discount_label, product_sizes(size_uk, is_default, sort_order)), " +
        "customization_parts(id, name, sort_order), " +
        "customization_colours(id, name, hex, sort_order)",
    )
    .eq("product_id", productId)
    .maybeSingle()
    .overrideTypes<CustomizationConfigRow | null, { merge: false }>();
  if (error) throw new CatalogueError(`customisation for "${productId}"`, error);
  if (!data) return null;

  const what = `customisation for "${productId}"`;
  if (!data.product) throw new CatalogueError(what, { message: "product not found" });
  const { sizesUK, defaultSizeUK } = sizesOf(data.product.product_sizes);
  if (sizesUK.length === 0 || defaultSizeUK === null) {
    throw new CatalogueError(what, { message: "product has no sizes or no default size" });
  }

  return {
    productId: data.product_id,
    slug: data.product.slug,
    title: data.title,
    category: data.display_category,
    wordmark: data.wordmark,
    price: data.product.price,
    // The type needs a string; an empty label means "no discount label".
    discountLabel: data.product.discount_label ?? "",
    sizesUK,
    defaultSizeUK,
    angles: data.angles,
    parts: bySortOrder(data.customization_parts).map(({ id, name }) => ({ id, name })),
    colours: bySortOrder(data.customization_colours).map(({ id, name, hex }) => ({ id, name, hex })),
  };
}
