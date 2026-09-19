import { getProductBySlug } from "@/lib/data/supabaseCatalog";
import type { ProductDetail } from "@/lib/types";

/*
 * Product pages, read from Supabase.
 *
 * Routes: V1 has one built product page (static route table: slug + names for
 * the URL, the tab title and the header while loading). Any other slug is a
 * 404. Everything on the page comes from Supabase.
 */
export const PRODUCT_PAGES = [
  { slug: "nike-sabrina-2-ep", name: "Nike Sabrina 2 EP", shortName: "Sabrina 2 EP" },
] as const;

export interface ProductPageData {
  product: ProductDetail;
  /** Has a V1 customiser (otherwise Customise is Coming Soon). */
  customisable: boolean;
}

/**
 * One product page's data in the existing `ProductDetail` shape. Fields a
 * product page needs are required: if any is missing in the database this
 * throws (shown as an error) instead of inventing a value.
 */
export async function loadProductPage(slug: string): Promise<ProductPageData> {
  const p = await getProductBySlug(slug);
  if (!p) throw new Error(`Product "${slug}" is not in the catalogue.`);

  const { shortName, description, cutout, defaultSizeUK } = p;
  if (
    !p.hasProductPage ||
    !shortName ||
    !description ||
    !cutout ||
    defaultSizeUK === null ||
    p.gallery.length === 0 ||
    p.sizesUK.length === 0
  ) {
    const missing = [
      !p.hasProductPage && "product page flag",
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
