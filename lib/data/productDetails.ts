import type { ProductDetail } from "@/lib/types";

const dir = "/images/products/sabrina-2-ep";

/*
 * Product page data. Name, category, price, rating, excerpt, sizes and images
 * come from Figma 1:2478. The rest of the description, the product details
 * and the review texts are NOT in Figma — they are mock copy so the
 * "see more", Product Information and Reviews sections have content.
 */
const productDetails: ProductDetail[] = [
  {
    id: "nike-sabrina-2-ep",
    slug: "nike-sabrina-2-ep",
    name: "Nike Sabrina 2 EP",
    shortName: "Sabrina 2 EP",
    category: "Basketball Shoes",
    price: 17000,
    rating: 5,
    gallery: [
      { src: `${dir}/hero.png`, alt: "Nike Sabrina 2 EP in red", kind: "photo" },
      {
        src: `${dir}/sabrina-2-blue.png`,
        alt: "Nike Sabrina 2 EP in light blue",
        kind: "cutout",
        box: [8, 23, 142, 115],
      },
      {
        src: `${dir}/sabrina-2-purple.png`,
        alt: "Nike Sabrina 2 EP in purple",
        kind: "cutout",
        box: [15, 23, 136, 122],
      },
      {
        src: `${dir}/sabrina-1-olive.png`,
        alt: "Nike Sabrina 1 in olive",
        kind: "cutout",
        box: [13, 32, 132, 106],
      },
    ],
    cutout: `${dir}/sabrina-2-red.png`,
    // Shoe at x30 y215, 387×192 inside the 447×559 PNG.
    cutoutFrame: { aspect: 387 / 192, crop: [-7.75, -111.98, 115.5, 291.15] },
    // Brand listing: the same cut-out, 160px wide and centred in the card.
    listing: {
      brand: "nike",
      cardImage: {
        src: `${dir}/sabrina-2-red.png`,
        box: [13.5, 59, 160, 79.4],
        crop: [-7.75, -111.98, 115.5, 291.15],
        shadow: 0.15,
      },
    },
    description: {
      excerpt:
        "Sabrina Ionescu's success is no secret. Her game is based on living in the gym, getting in rep after rep to",
      rest: "perfect her craft. Built for that work ethic, this shoe pairs responsive cushioning with a secure, supportive fit and a durable outsole made for quick cuts on outdoor courts.",
    },
    sizesUK: [4, 5, 6, 7, 8, 9, 10, 11],
    defaultSizeUK: 7,
    details: [
      { label: "Colour shown", value: "University Red / White / Obsidian" },
      { label: "Style", value: "Basketball, low top" },
      { label: "Upper", value: "Engineered mesh with synthetic overlays" },
      { label: "Outsole", value: "Rubber, EP (Extra Protection) for outdoor courts" },
      { label: "Country of origin", value: "Vietnam" },
    ],
    reviews: [
      { id: "r1", author: "Aarav", rating: 5, text: "Great grip and very comfortable from day one." },
      { id: "r2", author: "Meera", rating: 5, text: "Fits true to size. The red looks even better in person." },
      { id: "r3", author: "Rohan", rating: 5, text: "Light and responsive — perfect for outdoor courts." },
      { id: "r4", author: "Diya", rating: 5, text: "Customised mine and it came out exactly as designed." },
      { id: "r5", author: "Kabir", rating: 5, text: "Solid support for quick cuts. Would buy again." },
    ],
  },
];

export async function getProductDetail(slug: string): Promise<ProductDetail | undefined> {
  return productDetails.find((p) => p.slug === slug);
}

export async function getProductDetailSlugs(): Promise<string[]> {
  return productDetails.map((p) => p.slug);
}
