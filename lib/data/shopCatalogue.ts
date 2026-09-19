import { getBrands, getProducts, type CatalogueProduct } from "@/lib/data/supabaseCatalog";
import type { Brand } from "@/lib/types";

/*
 * The Shop catalogue (Shop and its Filters screen), read from Supabase. The
 * database has no display-order column, so membership and order are fixed
 * here by id — the same 11 products, in the same order, as the V1 Shop
 * (Sabrina 2 EP is not part of Shop).
 */
export const SHOP_PRODUCT_IDS = [
  "nike-lite",
  "nike-air-force",
  "adidas-nmd",
  "puma-shuffle",
  "air-jordan-mid",
  "air-jordan-low-womens",
  "puma-classic",
  "new-balance-550",
  "nike-run",
  "adidas-run",
  "puma-sneakers",
];

// Figma's Shop by Brands shows these six, in this order.
export const SHOP_BRAND_IDS = ["nike", "adidas", "puma", "asics", "new-balance", "reebok"];

export interface ShopCatalogue {
  /** The Shop products, in Shop order. */
  products: CatalogueProduct[];
  /** "Shop by Brands", in Figma order. */
  brands: Brand[];
  /** Every brand, in brand-row order (sort_order). */
  allBrands: Brand[];
  /** Brand id → name, for text search. */
  brandNames: Record<string, string>;
}

/** Picks Shop's products and brands in Shop order; anything missing is an error, not a gap. */
export async function loadShopCatalogue(): Promise<ShopCatalogue> {
  const [products, allBrands] = await Promise.all([getProducts(), getBrands()]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const brandById = new Map(allBrands.map((b) => [b.id, b]));
  const pick = <T,>(map: Map<string, T>, ids: string[], kind: string) =>
    ids.map((id) => {
      const item = map.get(id);
      if (!item) throw new Error(`Shop ${kind} "${id}" is missing from the catalogue.`);
      return item;
    });
  return {
    products: pick(byId, SHOP_PRODUCT_IDS, "product"),
    brands: pick(brandById, SHOP_BRAND_IDS, "brand"),
    allBrands,
    brandNames: Object.fromEntries(allBrands.map((b) => [b.id, b.name])),
  };
}
