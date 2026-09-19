import type { CustomizationConfig } from "@/lib/types";

const dir = "/images/customizer";

/*
 * Customiser configs, one per customisable product. V1 has only Nike Air
 * Force (Figma 1:6606). Title, image, sizes, price and colours are from
 * Figma; the 12 parts are the confirmed list. Figma has a single angle of
 * this shoe, so the viewer's 360 control stays static.
 */
const customizations: CustomizationConfig[] = [
  {
    productId: "nike-air-force",
    slug: "nike-air-force",
    title: "Nike Air Force",
    category: "Custom Men’s Shoes",
    wordmark: "NIKE",
    price: 9999,
    discountLabel: "10% OFF",
    sizesUK: [6, 7, 8, 9, 10, 11],
    defaultSizeUK: 7,
    angles: [
      {
        src: `${dir}/red-shoe.png`,
        alt: "Nike Air Force in red, white and black, side view",
        frame: [12, 19.6, 371, 341],
        size: [326.7, 182.3],
        rotate: -36.57,
        shadow: [22.5, 45, 0.3],
      },
    ],
    parts: [
      { id: "vamp", name: "Vamp" },
      { id: "quarter", name: "Quarter" },
      { id: "toe-cap", name: "Toe Cap" },
      { id: "eyestay", name: "Eyestay" },
      { id: "tongue", name: "Tongue" },
      { id: "laces", name: "Laces" },
      { id: "heel-counter", name: "Heel Counter" },
      { id: "swoosh", name: "Swoosh" },
      { id: "collar", name: "Collar" },
      { id: "midsole", name: "Midsole" },
      { id: "outsole", name: "Outsole" },
      { id: "heel-tab", name: "Heel Tab" },
    ],
    colours: [
      { id: "black", name: "Black", hex: "#000000" },
      { id: "grey", name: "Grey", hex: "#808080" },
      { id: "orange", name: "Orange", hex: "#FDBA62" },
      { id: "teal", name: "Teal", hex: "#599C99" },
      { id: "red", name: "Red", hex: "#CD2626" },
      { id: "magenta", name: "Magenta", hex: "#E949ED" },
    ],
  },
];

export async function getCustomization(slug: string): Promise<CustomizationConfig | undefined> {
  return customizations.find((c) => c.slug === slug);
}

export async function getCustomizationSlugs(): Promise<string[]> {
  return customizations.map((c) => c.slug);
}
