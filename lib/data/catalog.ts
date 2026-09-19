import type { ListImage, ProductCardData } from "@/lib/types";
import { getProductDetail, getProductDetailSlugs } from "./productDetails";
import { getAllProducts } from "./products";

/** A product as lists outside Home need it (e.g. Wishlist). */
export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  /** Current selling price in rupees. */
  price: number;
  image: ListImage;
  /** Product page URL — only when that page is built (never a 404). */
  href?: string;
}

/**
 * Every product id the app can reference, resolved from BOTH the Home
 * catalogue (products.ts) and the product-page data (productDetails.ts).
 * Product-page data wins when an id exists in both.
 */
export async function getCatalogProducts(): Promise<Record<string, CatalogProduct>> {
  const catalog: Record<string, CatalogProduct> = {};
  const pageSlugs = new Set(await getProductDetailSlugs());

  for (const p of await getAllProducts()) {
    const [, , width, height] = p.image.box;
    catalog[p.id] = {
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      image: { src: p.image.src, aspect: width / height, crop: p.image.crop, flip: p.image.flip },
      href: pageSlugs.has(p.slug) ? `/products/${p.slug}` : undefined,
    };
  }

  for (const slug of pageSlugs) {
    const p = await getProductDetail(slug);
    if (!p) continue;
    catalog[p.id] = {
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      image: { src: p.cutout, aspect: p.cutoutFrame?.aspect ?? 1, crop: p.cutoutFrame?.crop },
      href: `/products/${p.slug}`,
    };
  }

  return catalog;
}

/**
 * Everything to list on a brand page: the brand's catalogue products (any
 * audience), then products that exist only as product pages but declare this
 * brand (e.g. Nike Sabrina 2 EP). `linkableIds` are those with a built page.
 */
export async function getBrandProducts(
  brandId: string,
): Promise<{ products: ProductCardData[]; linkableIds: string[] }> {
  const pageSlugs = await getProductDetailSlugs();
  const products: ProductCardData[] = (await getAllProducts()).filter((p) => p.brand === brandId);

  for (const slug of pageSlugs) {
    const p = await getProductDetail(slug);
    if (!p?.listing || p.listing.brand !== brandId) continue;
    if (products.some((q) => q.id === p.id)) continue;
    products.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      price: p.price,
      rating: p.rating,
      image: p.listing.cardImage,
    });
  }

  const linkableIds = products.filter((p) => pageSlugs.includes(p.slug)).map((p) => p.id);
  return { products, linkableIds };
}
