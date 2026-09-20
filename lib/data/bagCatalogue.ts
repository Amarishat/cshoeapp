import { getCustomizationConfig, getProductBySlug, getProducts } from "@/lib/data/supabaseCatalog";
import type { BagProduct } from "@/lib/types";

/**
 * Everything that can be in the Bag, from Supabase, keyed by product id —
 * the same mapping as V1: products with a built page use their cut-out
 * ("cover"); customisable products use the customiser's title, category and
 * image ("contain"), and win if a product has both. Price is always the
 * product's price. Products with neither can't be added to the Bag, so they
 * are not listed.
 */
export async function loadBagCatalogue(): Promise<Record<string, BagProduct>> {
  const products = await getProducts();
  const [details, configs] = await Promise.all([
    Promise.all(products.filter((p) => p.hasProductPage).map((p) => getProductBySlug(p.slug))),
    Promise.all(products.filter((p) => p.customizable).map((p) => getCustomizationConfig(p.id))),
  ]);

  const catalog: Record<string, BagProduct> = {};
  for (const d of details) {
    // A page product without a cut-out has nothing to show in the Bag.
    if (!d?.cutout) continue;
    catalog[d.id] = {
      productId: d.id,
      slug: d.slug,
      name: d.name,
      category: d.category,
      price: d.price,
      image: { src: d.cutout, fit: "cover" },
    };
  }
  for (const c of configs) {
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
