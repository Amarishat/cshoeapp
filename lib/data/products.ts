import type { Product } from "@/lib/types";

const img = (file: string) => `/images/products/${file}`;

// Mock catalogue. Names, categories, prices and image placement come from the
// Home frame (Figma 1:1642).
const products: Product[] = [
  // Top Picks for You
  {
    id: "nike-lite",
    slug: "nike-lite",
    name: "Nike Lite",
    brand: "nike",
    category: "Men’s Tennis Shoe",
    audience: "men",
    price: 9900,
    rating: 5,
    image: { src: img("nike-court-lite-4.png"), box: [2, 7, 182, 152], shadow: 0.15 },
    customizable: false,
  },
  {
    id: "nike-air-force",
    slug: "nike-air-force",
    name: "Nike Air Force",
    brand: "nike",
    category: "Men’s Shoe",
    audience: "men",
    // Approved selling price; matches the Customizer config (customizations.ts).
    price: 9999,
    rating: 5,
    image: { src: img("nike-air-force-1-mid.png"), box: [16, 15, 157, 152], shadow: 0.3 },
    customizable: false,
  },
  {
    id: "adidas-nmd",
    slug: "adidas-nmd",
    name: "Adidas NMD",
    brand: "adidas",
    category: "Men’s Shoe",
    audience: "men",
    price: 8900,
    rating: 5,
    image: { src: img("adidas-nmd-r1.png"), box: [17, 21, 167, 158], flip: true },
    customizable: false,
  },
  {
    id: "puma-shuffle",
    slug: "puma-shuffle",
    name: "Puma Shuffle",
    brand: "puma",
    category: "Men’s Shoe",
    audience: "men",
    price: 8900,
    rating: 5,
    image: { src: img("puma-shuffle-mid.png"), box: [19, 40, 150, 132] },
    customizable: false,
  },

  // Top Trending Products
  {
    id: "air-jordan-mid",
    slug: "air-jordan-mid",
    name: "Air Jordan",
    brand: "nike",
    category: "Men’s Shoe",
    audience: "men",
    price: 9900,
    rating: 5,
    image: { src: img("air-jordan-1-mid-se-craft.png"), box: [8, 31, 162, 136] },
    customizable: false,
  },
  {
    id: "air-jordan-low-womens",
    slug: "air-jordan-low-womens",
    name: "Air Jordan",
    brand: "nike",
    category: "Women’s Shoe",
    audience: "women",
    price: 9900,
    rating: 5,
    image: { src: img("air-jordan-1-low-se-womens.png"), box: [15, 31, 157, 136] },
    customizable: false,
  },
  {
    id: "puma-classic",
    slug: "puma-classic",
    name: "Puma Classic",
    brand: "puma",
    category: "Men’s Shoe",
    audience: "men",
    price: 9900,
    rating: 5,
    image: {
      src: img("puma-classic-cat.png"),
      box: [10, 69, 167, 84],
      crop: [0, -51.79, 100, 198.81],
    },
    customizable: false,
  },
  {
    id: "new-balance-550",
    slug: "new-balance-550",
    name: "New Balance",
    brand: "new-balance",
    category: "Men’s Shoe",
    audience: "men",
    price: 9900,
    rating: 5,
    image: { src: img("new-balance-550.png"), box: [23, 60, 143, 93] },
    customizable: false,
  },

  // Top Trending Customisation
  {
    id: "nike-run",
    slug: "nike-run",
    name: "Nike Run",
    brand: "nike",
    category: "Men’s Shoe",
    audience: "men",
    price: 1700,
    rating: 5,
    image: {
      src: img("nike-custom-v2k.png"),
      box: [12, 70, 164, 82],
      crop: [-7.32, -85.98, 114.02, 228.05],
    },
    customizable: true,
  },
  {
    id: "adidas-run",
    slug: "adidas-run",
    name: "Adidas Run",
    brand: "adidas",
    category: "Men’s Shoe",
    audience: "men",
    price: 1700,
    rating: 5,
    image: {
      src: img("adidas-run-70s.png"),
      box: [17, 70, 153, 82],
      crop: [-11.11, -61.59, 124.18, 231.71],
    },
    customizable: true,
  },
  {
    id: "puma-sneakers",
    slug: "puma-sneakers",
    name: "Puma Sneakers",
    brand: "puma",
    category: "Men’s Shoe",
    audience: "men",
    price: 1700,
    rating: 5,
    image: {
      src: img("puma-slipstream.png"),
      box: [18, 64, 147, 88],
      crop: [-4.08, -42.05, 109.52, 182.95],
    },
    customizable: true,
  },
];

function byIds(ids: string[]): Product[] {
  return ids.map((id) => {
    const product = products.find((p) => p.id === id);
    if (!product) throw new Error(`Unknown product: ${id}`);
    return product;
  });
}

/** Every catalogue product (Home cards). */
export async function getAllProducts(): Promise<Product[]> {
  return products;
}

/** The product lists shown on Home, in Figma order. */
export async function getHomeProducts() {
  return {
    topPicks: byIds(["nike-lite", "nike-air-force", "adidas-nmd", "puma-shuffle"]),
    trending: byIds(["air-jordan-mid", "air-jordan-low-womens", "puma-classic", "new-balance-550"]),
    trendingCustomisation: byIds(["nike-run", "adidas-run", "puma-sneakers"]),
  };
}
