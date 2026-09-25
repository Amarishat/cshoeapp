import { getCustomizationConfig } from "@/lib/data/supabaseCatalog";
import type { CustomizationConfig } from "@/lib/types";

/*
 * Customiser pages, read from Supabase.
 *
 * Routes: V1 has one built customiser (static route table: slug, the product
 * it customises and the name for the URL, the tab title and the header while
 * loading). Any other slug is a 404. Everything on the screen — price, sizes,
 * parts and colours — comes from Supabase.
 */
export const CUSTOMIZER_PAGES = [
  { slug: "nike-air-force", productId: "nike-air-force", title: "Nike Air Force" },
] as const;

const CUSTOMIZER_SLUGS: ReadonlySet<string> = new Set(CUSTOMIZER_PAGES.map((page) => page.slug));

/**
 * Whether /products/<slug>/customise exists. A product's is_customizable flag
 * alone isn't enough (an admin can switch it on for any product): links to a
 * customiser must also check this, or they lead to a 404.
 */
export function hasCustomizerPage(slug: string): boolean {
  return CUSTOMIZER_SLUGS.has(slug);
}

/**
 * One customiser's config in the existing `CustomizationConfig` shape. Parts,
 * colours and a shoe angle are required: if any is missing in the database
 * this throws (shown as an error) instead of rendering an empty customiser.
 */
export async function loadCustomizerPage(slug: string): Promise<CustomizationConfig> {
  const page = CUSTOMIZER_PAGES.find((p) => p.slug === slug);
  if (!page) throw new Error(`"${slug}" has no customiser.`);

  const config = await getCustomizationConfig(page.productId);
  if (!config) throw new Error(`Product "${page.productId}" has no customisation in the catalogue.`);

  if (config.parts.length === 0 || config.colours.length === 0 || config.angles.length === 0) {
    const missing = [
      config.parts.length === 0 && "parts",
      config.colours.length === 0 && "colours",
      config.angles.length === 0 && "shoe images",
    ].filter(Boolean);
    throw new Error(`Customisation for "${page.productId}" is missing: ${missing.join(", ")}.`);
  }
  return config;
}
