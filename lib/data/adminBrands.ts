import { getBrands, getProducts } from "@/lib/data/supabaseCatalog";

/*
 * Brands for the admin, read with the same catalogue queries the storefront
 * uses. public.brands has no separate slug column — the id is the slug (it is
 * the /brands/[brand] URL segment, and the table constrains it to slug form).
 * Product counts are worked out from the products already loaded, so this
 * adds no new kind of database query and no schema change.
 */

export interface AdminBrand {
  /** Primary key, and the slug used in /brands/[brand]. */
  id: string;
  name: string;
  logoUrl: string;
  /** How many catalogue products name this brand. */
  productCount: number;
}

/** Every brand in brand-row order (sort_order), with its product count. */
export async function loadAdminBrands(): Promise<AdminBrand[]> {
  const [brands, products] = await Promise.all([getBrands(), getProducts()]);

  const counts = new Map<string, number>();
  for (const product of products) {
    counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
  }

  return brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    logoUrl: brand.logo,
    productCount: counts.get(brand.id) ?? 0,
  }));
}
