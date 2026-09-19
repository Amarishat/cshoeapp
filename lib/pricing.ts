import type { BagProduct, CartItem } from "@/lib/types";

/** Fixed charges from the Bag frame (Figma 1:2713). */
export const DELIVERY_FEE = 1250;
export const PLATFORM_FEE = 9;

export const isSelected = (item: CartItem) => item.selected !== false;

export interface BagTotals {
  selectedCount: number;
  /** Pairs in the order (sum of selected quantities) — "Price (N items)". */
  selectedQuantity: number;
  /** Price × quantity of the selected items. */
  subtotal: number;
  delivery: number;
  platformFee: number;
  total: number;
}

export function computeBagTotals(
  items: CartItem[],
  catalog: Record<string, BagProduct>,
): BagTotals {
  const selected = items.filter((item) => isSelected(item) && catalog[item.productId]);
  const subtotal = selected.reduce(
    (sum, item) => sum + catalog[item.productId].price * item.quantity,
    0,
  );
  const hasOrder = selected.length > 0;
  const delivery = hasOrder ? DELIVERY_FEE : 0;
  const platformFee = hasOrder ? PLATFORM_FEE : 0;
  return {
    selectedCount: selected.length,
    selectedQuantity: selected.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    delivery,
    platformFee,
    total: subtotal + delivery + platformFee,
  };
}

// Display formatting only — amounts are whole rupees, and nothing here rounds.

/** "17,000" — Indian digit grouping, for layouts that style the ₹ separately. */
export const formatNumber = (n: number) => n.toLocaleString("en-IN");
/** "₹17,000" — item prices, bottom bars and other single amounts. */
export const formatPrice = (n: number) => `₹${formatNumber(n)}`;
/** "₹1,250.00" — detailed price rows (Subtotal, Delivery, Total Amount…). */
export const formatAmount = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
