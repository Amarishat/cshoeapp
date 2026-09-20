import { getProductBySlug, getProducts } from "@/lib/data/supabaseCatalog";
import type { CatalogProduct } from "@/lib/types";

/**
 * Product info for Wishlist rows, from Supabase, keyed by product id. Same
 * mapping as V1: products with a built page use their transparent cut-out
 * and link to the page; the others use their card image and are Coming Soon.
 */
export async function loadWishlistCatalogue(): Promise<Record<string, CatalogProduct>> {
  const products = await getProducts();
  // Cut-outs are product-page data (V1: only Sabrina 2 EP has a page).
  const details = await Promise.all(
    products.filter((p) => p.hasProductPage).map((p) => getProductBySlug(p.slug)),
  );
  const detailById = new Map(details.filter((d) => d !== null).map((d) => [d.id, d]));

  const catalog: Record<string, CatalogProduct> = {};
  for (const p of products) {
    const detail = detailById.get(p.id);
    const [, , width, height] = p.image.box;
    catalog[p.id] = {
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      image: detail?.cutout
        ? { src: detail.cutout, aspect: detail.cutoutFrame?.aspect ?? 1, crop: detail.cutoutFrame?.crop }
        : { src: p.image.src, aspect: width / height, crop: p.image.crop, flip: p.image.flip },
      href: p.hasProductPage ? `/products/${p.slug}` : undefined,
    };
  }
  return catalog;
}
