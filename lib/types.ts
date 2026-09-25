export type Audience = "men" | "women" | "kids";

export interface Brand {
  id: string;
  name: string;
  logo: string;
  /** Logo size inside the 63×59 brand tile, from Figma. */
  logoWidth: number;
  logoHeight: number;
}

/** [left, top, width, height] */
export type Rect = [number, number, number, number];

/**
 * A product image for list tiles of any size: the shoe's own frame (its
 * aspect ratio) plus, for padded PNGs, the image's rect as % of that frame.
 */
export interface ListImage {
  src: string;
  /** Width / height of the shoe frame. */
  aspect: number;
  crop?: Rect;
  flip?: boolean;
}

/**
 * Where a product photo sits inside the 187×198 product card, copied from the
 * Figma layer geometry so each cut-out shoe lands exactly where it was designed.
 */
export interface CardImage {
  src: string;
  /** Image frame in px, relative to the 187×198 card. */
  box: Rect;
  /** Figma crop: the image's own rect as % of the frame (for PNGs with lots of padding). */
  crop?: Rect;
  /** Mirrored horizontally in Figma. */
  flip?: boolean;
  /** Opacity of Figma's 0 15px 30px black drop shadow. */
  shadow?: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  /** e.g. "Men’s Shoe", "Men’s Tennis Shoe" */
  category: string;
  audience: Audience;
  /** MRP in rupees */
  price: number;
  rating: number;
  image: CardImage;
  customizable: boolean;
}

/** What a product card needs (a catalogue product or a product-page listing). */
export type ProductCardData = Pick<Product, "id" | "slug" | "name" | "category" | "price" | "rating" | "image">;

/** A product as lists outside Home need it (e.g. Wishlist). */
export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  /** Current selling price in rupees. */
  price: number;
  image: ListImage;
  /** Product page URL — only when that page is built (never a 404). */
  href?: string;
}

/** One slide of the product page gallery. */
export interface GalleryImage {
  src: string;
  alt: string;
  /** `photo` fills the frame; `cutout` is a transparent PNG placed on #F5F5F5. */
  kind: "photo" | "cutout";
  /** For cut-outs: image frame in px inside the 158×163 Figma thumbnail tile. */
  box?: Rect;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
}

/** Everything the Product screen (Figma 1:2478) needs. */
export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  /** Header title, e.g. "Sabrina 2 EP" */
  shortName: string;
  category: string;
  price: number;
  rating: number;
  /** First image is the hero; the rest also appear as thumbnails. */
  gallery: GalleryImage[];
  /** Transparent cut-out used in lists such as the Bag. */
  cutout: string;
  /** Where the shoe sits inside `cutout` (the PNG has wide transparent margins). */
  cutoutFrame?: Pick<ListImage, "aspect" | "crop">;
  /**
   * Lets a product that has a page but isn't in the Home catalogue appear in
   * brand listings: its brand id and the cut-out's placement in a 187×198 card.
   */
  listing?: { brand: string; cardImage: CardImage };
  description: { excerpt: string; rest: string };
  /** UK/India sizes in display order. */
  sizesUK: number[];
  defaultSizeUK: number;
  details: { label: string; value: string }[];
  reviews: Review[];
}

/** A customisable area of a shoe. `id` is stable so it can later name a 3D mesh/material. */
export interface CustomizationPart {
  id: string;
  name: string;
}

export interface CustomizationColour {
  id: string;
  name: string;
  hex: string;
}

/** Part id → colour id. Stored on the bag item; ready to drive future image/3D rendering. */
export type CustomizationSelection = Record<string, string>;

/**
 * One view of the shoe in the customiser's viewer. Geometry is in Figma px
 * inside the 430×528 viewer: `frame` is the bounding box the rotated image is
 * centred in.
 */
/** Centre and font size of the viewer's faded brand wordmark, in viewer px. */
export interface WordmarkPlacement {
  x: number;
  y: number;
  size: number;
}

export interface ViewerAngle {
  src: string;
  alt: string;
  frame: Rect;
  size: [number, number];
  rotate: number;
  /** [offsetY, blur, opacity] of a black drop shadow. */
  shadow?: [number, number, number];
}

/** Everything the Customizer screen (Figma 1:6606) needs for one product. */
export interface CustomizationConfig {
  productId: string;
  slug: string;
  title: string;
  /** Shown under the name in the Bag, e.g. "Custom Men’s Shoes". */
  category: string;
  /** Large faded brand name behind the shoe. */
  wordmark: string;
  price: number;
  discountLabel: string;
  sizesUK: number[];
  defaultSizeUK: number;
  /** One or more views; two or more enable swiping between angles. */
  angles: ViewerAngle[];
  parts: CustomizationPart[];
  colours: CustomizationColour[];
}

export interface CartItem {
  id: string;
  productId: string;
  size: string;
  quantity: number;
  /** Present when the shoe was customised: part id → colour id. */
  customization?: CustomizationSelection;
  /** Included in the order (Bag checkbox). Missing means selected. */
  selected?: boolean;
}

export type AddressType = "home" | "office" | "other";

/** A saved delivery address (Figma Address 1:3396). */
export interface Address {
  id: string;
  fullName: string;
  /** 10 digits */
  phone: string;
  /** 6 digits */
  pincode: string;
  state: string;
  city: string;
  area: string;
  street: string;
  type: AddressType;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, "id">;

/** State → city → area options for the address dropdowns. */
export interface LocationState {
  name: string;
  cities: { name: string; areas: string[] }[];
}

export type PaymentMethodId = "card" | "netbanking" | "wallets" | "upi" | "cod";
export type UpiAppId = "gpay" | "phonepe" | "paytm";

export type OrderStatus = "confirmed" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";

/** One product line of a placed order — a snapshot, so later catalogue changes don't alter it. */
/** A part/colour choice as it was when the order was placed (names kept). */
export interface OrderCustomizationChoice {
  partId: string;
  partName: string;
  colourId: string;
  colourName: string;
}

export interface OrderLine {
  /** The Bag item this came from (used to clear it from the Bag). */
  bagItemId: string;
  productId: string;
  name: string;
  category: string;
  image: BagProduct["image"];
  size: string;
  quantity: number;
  unitPrice: number;
  customization?: CustomizationSelection;
  /** The same choices with their names, for orders read back from the database. */
  customizationChoices?: OrderCustomizationChoice[];
}

/** An order (created by the database function place_order()). */
export interface Order {
  /** e.g. "OD1789812345678" (Figma order ids look like "OD99997989899"). */
  id: string;
  createdAt: string;
  /** Drives the progress tracker; "cancelled" is its own end state, not a delivery step. */
  status: OrderStatus;
  /** When the customer cancelled it (cancel_order()); null if it isn't cancelled or the time isn't known. */
  cancelledAt: string | null;
  lines: OrderLine[];
  address: Address;
  payment: { method: "upi"; app: UpiAppId };
  /**
   * What was paid at checkout (orders.amount_paid): the total when the order
   * was placed. Unlike totals.total it never changes when items are edited.
   * null only if it isn't recorded yet.
   */
  amountPaid: number | null;
  totals: {
    subtotal: number;
    discount: number;
    delivery: number;
    platformFee: number;
    total: number;
  };
}

/** What the Bag needs to show and price a bag item. */
export interface BagProduct {
  productId: string;
  /** Product page / customiser URL slug, e.g. "nike-air-force". */
  slug: string;
  name: string;
  category: string;
  /** Current selling price in rupees. */
  price: number;
  image: { src: string; fit: "cover" | "contain" };
}
