import { getProductBySlug, getProducts } from "@/lib/data/supabaseCatalog";
import type { ProductDetail } from "@/lib/types";

/*
 * Product pages, read from Supabase.
 *
 * Routes: a product has a page when its `has_product_page` flag is set — no
 * list of slugs in the code. The built pages are prerendered from that flag,
 * and a product enabled later still works (the route is dynamic). Any slug
 * without the flag is a 404.
 */

export interface ProductPageMeta {
  slug: string;
  name: string;
  /** Header title, e.g. "Sabrina 2 EP" (falls back to the full name). */
  shortName: string;
}

export interface ProductPageData {
  product: ProductDetail;
  /** Has a V1 customiser (otherwise Customise is Coming Soon). */
  customisable: boolean;
}

/** Slugs of every product with a page, for prerendering the routes. */
export async function listProductPageSlugs(): Promise<string[]> {
  const products = await getProducts();
  return products.filter((p) => p.hasProductPage).map((p) => p.slug);
}

/**
 * A product page's names, or null when that slug has no page (unknown
 * product, or `has_product_page` not set) — the route turns that into a 404.
 */
export async function getProductPageMeta(slug: string): Promise<ProductPageMeta | null> {
  const product = await getProductBySlug(slug);
  if (!product?.hasProductPage) return null;
  return { slug: product.slug, name: product.name, shortName: product.shortName ?? product.name };
}

/**
 * One product page's data in the existing `ProductDetail` shape, or null when
 * that slug has no page. Fields a product page needs are required: if the
 * product has a page but any of them is missing in the database this throws
 * (shown as an error) instead of inventing a value.
 */
export async function loadProductPage(slug: string): Promise<ProductPageData | null> {
  const p = await getProductBySlug(slug);
  if (!p?.hasProductPage) return null;

  const { shortName, description, cutout, defaultSizeUK } = p;
  if (
    !shortName ||
    !description ||
    !cutout ||
    defaultSizeUK === null ||
    p.gallery.length === 0 ||
    p.sizesUK.length === 0
  ) {
    const missing = [
      !shortName && "short name",
      !description && "description",
      !cutout && "cut-out image",
      defaultSizeUK === null && "default size",
      p.gallery.length === 0 && "gallery images",
      p.sizesUK.length === 0 && "sizes",
    ].filter(Boolean);
    throw new Error(`Product "${slug}" is missing product-page data: ${missing.join(", ")}.`);
  }

  return {
    product: {
      id: p.id,
      slug: p.slug,
      name: p.name,
      shortName,
      category: p.category,
      price: p.price,
      rating: p.rating,
      gallery: p.gallery,
      cutout,
      ...(p.cutoutFrame ? { cutoutFrame: p.cutoutFrame } : {}),
      description,
      sizesUK: p.sizesUK,
      defaultSizeUK,
      details: p.details,
      reviews: p.reviews,
    },
    customisable: p.customizable,
  };
}
