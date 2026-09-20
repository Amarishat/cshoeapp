import { CUSTOMIZER_PAGES } from "@/lib/data/customizerPages";
import { getBrands, getProducts, type CatalogueProduct } from "@/lib/data/supabaseCatalog";
import type { Brand } from "@/lib/types";

/*
 * The Customise Hub's catalogue, read from Supabase. Membership and order are
 * curation, so they stay here: Figma's brand circles (with their own logo
 * sizes) and the shoes that have a built Customizer — the same rule as V1,
 * now taken from the customiser route table rather than a mock slug list.
 */

/**
 * Figma's brand circles (1:3109), in order, with the logo box each one is
 * drawn in. The sizes are Figma layout values and belong to this screen, not
 * to the database.
 */
export const HUB_BRANDS = [
  { id: "nike", logoWidth: 24, logoHeight: 28 },
  { id: "adidas", logoWidth: 30, logoHeight: 30 },
  { id: "puma", logoWidth: 30, logoHeight: 30 },
  { id: "reebok", logoWidth: 36, logoHeight: 45 },
  { id: "new-balance", logoWidth: 30, logoHeight: 14.43 },
];

/** Brand ids of the circles, in Figma order. */
export const HUB_BRAND_IDS = HUB_BRANDS.map((b) => b.id);

export interface CustomiseHubCatalogue {
  /** Products with a built Customizer, in customiser order. */
  products: CatalogueProduct[];
  /** The brand circles, in Figma order. */
  brands: Brand[];
}

/** The hub's products and brands; anything missing is an error, not a gap. */
export async function loadCustomiseHub(): Promise<CustomiseHubCatalogue> {
  const [products, allBrands] = await Promise.all([getProducts(), getBrands()]);
  const productById = new Map(products.map((p) => [p.id, p]));
  const brandById = new Map(allBrands.map((b) => [b.id, b]));

  return {
    products: CUSTOMIZER_PAGES.map((page) => {
      const product = productById.get(page.productId);
      if (!product) throw new Error(`Customisable product "${page.productId}" is missing from the catalogue.`);
      return product;
    }),
    brands: HUB_BRANDS.map(({ id, logoWidth, logoHeight }) => {
      const brand = brandById.get(id);
      if (!brand) throw new Error(`Brand "${id}" is missing from the catalogue.`);
      // Name and logo come from Supabase; the circle's logo box stays in Figma's values.
      return { ...brand, logoWidth, logoHeight };
    }),
  };
}
