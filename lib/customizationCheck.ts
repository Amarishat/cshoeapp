import type { BagProduct, CartItem, CustomizationSelection } from "@/lib/types";

/*
 * Whether a saved design (a customer's { partId: colourId } choices) still
 * fits the customiser as it is now. An admin can remove a part or a colour
 * after a design was saved on the device or put in the Bag; place_order()
 * then refuses the order ("Invalid customisation"). The same rule is checked
 * here — every chosen part must still exist, with a colour that still exists
 * — so the app can say so early instead. Designs are never changed here.
 */

/** A customiser's current part and colour ids. */
export interface CustomizerOptions {
  partIds: readonly string[];
  colourIds: readonly string[];
}

/** What the customer is told about a design that no longer fits. */
export const STALE_DESIGN_MESSAGE =
  "This saved design uses a colour or part that’s no longer available. Please recreate it.";

/** Whether every chosen part and colour still exists (an empty design always fits). */
export function designMatches(selection: CustomizationSelection, options: CustomizerOptions): boolean {
  return Object.entries(selection).every(
    ([part, colour]) =>
      typeof colour === "string" && options.partIds.includes(part) && options.colourIds.includes(colour),
  );
}

/**
 * Whether a Bag item's design can't be ordered: it has a design, and its
 * product has no usable customiser now or the design no longer fits it.
 */
export function isStaleDesign(item: CartItem, product: BagProduct | undefined): boolean {
  if (!item.customization || Object.keys(item.customization).length === 0) return false;
  return !product?.customizer || !designMatches(item.customization, product.customizer);
}
