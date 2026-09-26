import { SHOP_PRODUCT_IDS } from "@/lib/data/shopCatalogue";
import { getBrands, getProducts, type CatalogueProduct } from "@/lib/data/supabaseCatalog";
import type { Brand } from "@/lib/types";

/*
 * Brand pages, read from Supabase.
 *
 * Routes: the 7 brand pages that exist (static route table: id + name for
 * the URL and the tab title). Any other slug is a 404. Everything shown on
 * the page — brand selector, logos, products — comes from Supabase.
 *
 * Products: a brand page lists the brand's Shop products (all audiences) in
 * Shop order, then products that only exist as product pages (Nike Sabrina 2
 * EP) — the same membership and order as the V1 brand pages. The database
 * has no display-order column, so the order is fixed here by id.
 */
export const BRAND_PAGES = [
  { id: "nike", name: "Nike" },
  { id: "adidas", name: "Adidas" },
  { id: "puma", name: "Puma" },
  { id: "reebok", name: "Reebok" },
  { id: "new-balance", name: "New Balance" },
  { id: "fila", name: "Fila" },
  { id: "asics", name: "Asics" },
] as const;

const BRAND_PAGE_PRODUCT_IDS = [...SHOP_PRODUCT_IDS, "nike-sabrina-2-ep"];

export interface BrandCatalogue {
  /** All brands, in brand-row order (sort_order). */
  brands: Brand[];
  /** Every brand-page product, in brand-page order; filter by `brand`. */
  products: CatalogueProduct[];
}

/**
 * Brands and brand-page products. A product id that's no longer in the
 * catalogue is simply left out (the rest keep their order), so one removed
 * row can't take every brand page down; a failed read still throws.
 */
export async function loadBrandCatalogue(): Promise<BrandCatalogue> {
  const [brands, all] = await Promise.all([getBrands(), getProducts()]);
  const byId = new Map(all.map((p) => [p.id, p]));
  const products = BRAND_PAGE_PRODUCT_IDS.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
  return { brands, products };
}
