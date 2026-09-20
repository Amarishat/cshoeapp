import { getCustomizationConfig } from "@/lib/data/supabaseCatalog";
import type { CustomizationColour, ViewerAngle, WordmarkPlacement } from "@/lib/types";

/**
 * Limited Edition screen (Figma 1:2893), read from Supabase. V1 features the
 * existing Nike Air Force — its name, price, sizes, wordmark and red shoe
 * image come from that product's customisation config. Only the layout below
 * is specific to this screen (viewer px, same space as the Customizer's
 * viewer). No drop dates, stock or other products.
 */
const LAYOUT = {
  productId: "nike-air-force",
  // Hero shoe: 285×160 image rotated -38° in a 323×301 frame at (24, 69).
  hero: { frame: [24.13, 69.38, 322.85, 301.28], size: [284.77, 159.89], rotate: -37.99 },
  wordmark: { x: 254.81, y: 235.5, size: 160 } satisfies WordmarkPlacement,
  // Only the red colourway has an image.
  colourways: [{ id: "red", name: "Red", hex: "#CD2626" }] satisfies CustomizationColour[],
} as const;

export interface LimitedEdition {
  productId: string;
  name: string;
  price: number;
  /** Display-only, e.g. "10% OFF" — never applied to the price. */
  discountLabel: string;
  sizesUK: number[];
  wordmark: string;
  wordmarkPlacement: WordmarkPlacement;
  hero: ViewerAngle;
  colourways: CustomizationColour[];
}

/** The featured product, in Figma's layout; anything missing is an error, not a gap. */
export async function loadLimitedEdition(): Promise<LimitedEdition> {
  const product = await getCustomizationConfig(LAYOUT.productId);
  if (!product) throw new Error(`Product "${LAYOUT.productId}" has no customisation in the catalogue.`);
  const [image] = product.angles;
  if (!image) throw new Error(`Product "${LAYOUT.productId}" has no shoe image.`);

  return {
    productId: product.productId,
    name: product.title,
    price: product.price,
    discountLabel: product.discountLabel,
    sizesUK: product.sizesUK,
    wordmark: product.wordmark,
    wordmarkPlacement: LAYOUT.wordmark,
    hero: {
      ...image,
      frame: [...LAYOUT.hero.frame],
      size: [...LAYOUT.hero.size],
      rotate: LAYOUT.hero.rotate,
    },
    colourways: [...LAYOUT.colourways],
  };
}
