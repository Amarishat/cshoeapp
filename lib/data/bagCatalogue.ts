import {
  CatalogueDataError,
  getCustomizationConfig,
  getProductBySlug,
  getProducts,
} from "@/lib/data/supabaseCatalog";
import type { BagProduct, CustomizationConfig } from "@/lib/types";

/**
 * One customisable product's customiser, or null when its setup is
 * incomplete or malformed (no sizes, no default size, no shoe image). Such a
 * product is simply left out of the Bag catalogue — it shows as unavailable
 * and can't be ordered (place_order() and the checkout screens refuse it) —
 * so one bad setup can't take the Bag and checkout down for everyone. A
 * failed request is still thrown, so a real outage shows the error state.
 */
async function usableCustomizer(productId: string): Promise<CustomizationConfig | null> {
  let config: CustomizationConfig | null;
  try {
    config = await getCustomizationConfig(productId);
  } catch (error) {
    if (error instanceof CatalogueDataError) return null;
    throw error;
  }
  const image = config?.angles[0]?.src;
  return config && typeof image === "string" && image !== "" ? config : null;
}

/**
 * Everything that can be in the Bag, from Supabase, keyed by product id.
 *
 * A product shows itself — its name, category and cut-out ("cover") — and the
 * customiser's title, category and image ("contain") are the fallback for a
 * customisable product that has no cut-out of its own. That is the order
 * place_order() uses for a plain order line, so the Bag and the order it
 * becomes show the same thing. Price is always the product's price, and
 * products with neither image can't be added to the Bag, so they aren't
 * listed. Neither is a customisable product whose customiser setup is
 * incomplete (see usableCustomizer).
 */
export async function loadBagCatalogue(): Promise<Record<string, BagProduct>> {
  const products = await getProducts();
  const [details, configs] = await Promise.all([
    Promise.all(products.filter((p) => p.hasProductPage).map((p) => getProductBySlug(p.slug))),
    Promise.all(products.filter((p) => p.customizable).map((p) => usableCustomizer(p.id))),
  ]);

  const catalog: Record<string, BagProduct> = {};
  // Each customiser's current parts and colours, kept whichever entry shows the
  // product, so Bag and checkout can tell a design that no longer fits.
  const customizers = new Map(
    configs.flatMap((c) =>
      c ? [[c.productId, { partIds: c.parts.map((p) => p.id), colourIds: c.colours.map((k) => k.id) }] as const] : [],
    ),
  );
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
      customizer: customizers.get(c.productId),
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
      ...(customizers.has(d.id) ? { customizer: customizers.get(d.id) } : {}),
    };
  }
  return catalog;
}
