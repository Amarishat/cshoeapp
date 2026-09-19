import type { Audience, Product } from "@/lib/types";

/** Only sorts our catalogue can support (by price). */
export type ShopSort = "price-asc" | "price-desc";

export const SORT_OPTIONS: { value: ShopSort; label: string }[] = [
  { value: "price-asc", label: "Price (Low-High)" },
  { value: "price-desc", label: "Price (High-Low)" },
];

export interface ShopFilters {
  sort: ShopSort | null;
  /** `null` = the full catalogue price range. */
  price: [number, number] | null;
  /** Brand ids; empty = all brands. */
  brands: string[];
}

export const DEFAULT_SHOP_FILTERS: ShopFilters = { sort: null, price: null, brands: [] };
export const DEFAULT_AUDIENCE: Audience = "men";

/** Lowest and highest catalogue price — the slider's bounds. */
export function priceBounds(products: Product[]): [number, number] {
  const prices = products.map((p) => p.price);
  return [Math.min(...prices), Math.max(...prices)];
}

/** Products matching audience (`null` = all audiences), brand and price (order unchanged). */
export function matchShopFilters(products: Product[], audience: Audience | null, filters: ShopFilters) {
  return products.filter(
    (p) =>
      (audience === null || p.audience === audience) &&
      (filters.brands.length === 0 || filters.brands.includes(p.brand)) &&
      (!filters.price || (p.price >= filters.price[0] && p.price <= filters.price[1])),
  );
}

/** Filtered and, if a sort is chosen, sorted by price (stable for ties). */
export function applyShopFilters(products: Product[], audience: Audience | null, filters: ShopFilters) {
  const matched = matchShopFilters(products, audience, filters);
  if (!filters.sort) return matched;
  const direction = filters.sort === "price-asc" ? 1 : -1;
  return [...matched].sort((a, b) => (a.price - b.price) * direction);
}

/** Number of active filter categories (audience ≠ Men, sort, price, brand). */
export function activeFilterCount(audience: Audience, filters: ShopFilters) {
  return (
    Number(audience !== DEFAULT_AUDIENCE) +
    Number(filters.sort !== null) +
    Number(filters.price !== null) +
    Number(filters.brands.length > 0)
  );
}

// ——— Text search (Home search bar → /shop?q=…) ———

export const AUDIENCES: Audience[] = ["men", "women", "kids"];

export function parseAudience(value: unknown): Audience | null {
  return typeof value === "string" && (AUDIENCES as string[]).includes(value) ? (value as Audience) : null;
}

/** Lower-cased words; apostrophes are dropped so "Men’s" / "men's" / "mens" all match. */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Catalogue products matching a query: every typed word must be the start of
 * a word in the product's name, brand name, category or audience (so "men"
 * doesn't match "women"). Only existing catalogue fields are searched.
 */
export function searchProducts(products: Product[], query: string, brandNames: Record<string, string>) {
  const terms = words(query);
  // Nothing searchable typed (e.g. only symbols): honestly no matches.
  if (terms.length === 0) return [];
  return products.filter((p) => {
    const haystack = words([p.name, brandNames[p.brand] ?? p.brand, p.category, p.audience].join(" "));
    return terms.every((term) => haystack.some((word) => word.startsWith(term)));
  });
}

/** Shop URL for a search; `audience` is only present when chosen explicitly. */
export function shopSearchHref(query: string, audience: Audience | null) {
  const params = new URLSearchParams({ q: query });
  if (audience) params.set("audience", audience);
  return `/shop?${params.toString()}`;
}
