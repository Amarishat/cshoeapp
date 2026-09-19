import type { Metadata } from "next";
import { FiltersView } from "@/components/shop/FiltersView";
import { getBrands } from "@/lib/data/brands";
import { getAllProducts } from "@/lib/data/products";
import { parseAudience, priceBounds } from "@/lib/shopFilters";

export const metadata: Metadata = { title: "Filters" };

/**
 * Sort & Filter — Figma frame 1:5769 (stack screen, opened from Shop's Filter
 * chip). During a Shop search it receives the same `?q=` / `?audience=`.
 */
export default async function FiltersPage({ searchParams }: PageProps<"/shop/filters">) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim() || null;
  const [products, allBrands] = await Promise.all([getAllProducts(), getBrands()]);
  // Only brands that actually have products in the catalogue.
  const brands = allBrands.filter((b) => products.some((p) => p.brand === b.id));
  const brandNames = Object.fromEntries(allBrands.map((b) => [b.id, b.name]));

  return (
    <FiltersView
      products={products}
      brands={brands}
      bounds={priceBounds(products)}
      brandNames={brandNames}
      query={query}
      searchAudience={query ? parseAudience(params.audience) : null}
    />
  );
}
