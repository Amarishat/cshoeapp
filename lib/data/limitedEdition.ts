import type { CustomizationColour, ViewerAngle, WordmarkPlacement } from "@/lib/types";
import { getCustomization } from "./customizations";

/**
 * Limited Edition screen (Figma 1:2893). V1 features the existing Nike Air
 * Force — its name, price, sizes and red shoe image come from the Customizer
 * config. Only the layout below is specific to this screen (viewer px, same
 * space as the Customizer's viewer). No drop dates, stock or other products.
 */
const LAYOUT = {
  slug: "nike-air-force",
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

export async function getLimitedEdition(): Promise<LimitedEdition | undefined> {
  const product = await getCustomization(LAYOUT.slug);
  if (!product) return undefined;
  const [image] = product.angles;
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
