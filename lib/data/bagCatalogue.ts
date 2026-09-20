import { getCustomizationConfig, getProductBySlug, getProducts } from "@/lib/data/supabaseCatalog";
import type { BagProduct } from "@/lib/types";

/**
 * Everything that can be in the Bag, from Supabase, keyed by product id.
 *
 * A product shows itself — its name, category and cut-out ("cover") — and the
 * customiser's title, category and image ("contain") are the fallback for a
 * customisable product that has no cut-out of its own. That is the order
 * place_order() uses for a plain order line, so the Bag and the order it
 * becomes show the same thing. Price is always the product's price, and
 * products with neither image can't be added to the Bag, so they aren't
 * listed.
 */
export async function loadBagCatalogue(): Promise<Record<string, BagProduct>> {
  const products = await getProducts();
  const [details, configs] = await Promise.all([
    Promise.all(products.filter((p) => p.hasProductPage).map((p) => getProductBySlug(p.slug))),
    Promise.all(products.filter((p) => p.customizable).map((p) => getCustomizationConfig(p.id))),
  ]);

  const catalog: Record<string, BagProduct> = {};
  // Fallback first, so a product with a cut-out replaces it below.
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
  for (const d of details) {
    // A page product without a cut-out has nothing of its own to show.
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
  return catalog;
}
