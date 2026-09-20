import type { BagProduct } from "@/lib/types";
import { getCustomization, getCustomizationSlugs } from "./customizations";
import { getProductDetail, getProductDetailSlugs } from "./productDetails";

/**
 * Everything that can currently be added to the bag, with its current
 * selling price and image. Items added from the customiser use the
 * customiser's price (Nike Air Force ₹9,999 — its "10% OFF" is a label only).
 * Customiser configs win if a product id exists in both sources.
 */
export async function getBagCatalog(): Promise<Record<string, BagProduct>> {
  const catalog: Record<string, BagProduct> = {};

  for (const slug of await getProductDetailSlugs()) {
    const p = await getProductDetail(slug);
    if (!p) continue;
    catalog[p.id] = {
      productId: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      price: p.price,
      image: { src: p.cutout, fit: "cover" },
    };
  }

  for (const slug of await getCustomizationSlugs()) {
    const c = await getCustomization(slug);
    if (!c) continue;
    catalog[c.productId] = {
      productId: c.productId,
      slug: c.slug,
      name: c.title,
      category: c.category,
      price: c.price,
      image: { src: c.angles[0].src, fit: "contain" },
    };
  }

  return catalog;
}
