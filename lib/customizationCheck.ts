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

/** What the customer is told when the shoe isn't customisable now (flag off, or no usable customiser). */
export const CUSTOMISATION_UNAVAILABLE_MESSAGE = "Customisation isn’t available for this shoe right now.";

/**
 * Why a Bag item's design can't be ordered, or null when it can (or it's a
 * plain item): "unavailable" when the shoe isn't customisable now — its
 * is_customizable flag is off or it has no usable customiser (the Bag
 * catalogue only carries a customiser for customisable products) — or
 * "stale" when a chosen part or colour no longer exists.
 */
export function designProblem(item: CartItem, product: BagProduct | undefined): "unavailable" | "stale" | null {
  if (!item.customization || Object.keys(item.customization).length === 0) return null;
  if (!product?.customizer) return "unavailable";
  return designMatches(item.customization, product.customizer) ? null : "stale";
}

/** Whether every chosen part and colour still exists (an empty design always fits). */
export function designMatches(selection: CustomizationSelection, options: CustomizerOptions): boolean {
  return Object.entries(selection).every(
    ([part, colour]) =>
      typeof colour === "string" && options.partIds.includes(part) && options.colourIds.includes(colour),
  );
}

/** Whether a Bag item's design can't be ordered, for either reason (see designProblem). */
export function isStaleDesign(item: CartItem, product: BagProduct | undefined): boolean {
  return designProblem(item, product) !== null;
}
