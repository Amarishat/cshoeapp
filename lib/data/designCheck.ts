import { CUSTOMISATION_UNAVAILABLE_MESSAGE, designMatches, STALE_DESIGN_MESSAGE } from "@/lib/customizationCheck";
import { CatalogueDataError, getCustomizationConfig } from "@/lib/data/supabaseCatalog";
import type { CustomizationSelection } from "@/lib/types";

/**
 * Why `design` can't be used with `productId`'s customiser as it is now, as a
 * message the customer can act on — or null when it can. Shared by the Bag
 * (lib/data/userCart.ts) and saved designs (lib/data/userDesigns.ts), so both
 * apply the same rule place_order() applies at payment:
 *  - the shoe must be customisable now (is_customizable on, and a usable
 *    customiser): CUSTOMISATION_UNAVAILABLE_MESSAGE otherwise;
 *  - every chosen part and colour must still exist: STALE_DESIGN_MESSAGE otherwise.
 * The design itself is never changed. A failed request (as opposed to a broken
 * customiser setup) is thrown, so callers report an outage, not a bad design.
 */
export async function currentDesignProblem(productId: string, design: CustomizationSelection): Promise<string | null> {
  let config: Awaited<ReturnType<typeof getCustomizationConfig>>;
  try {
    config = await getCustomizationConfig(productId);
  } catch (error) {
    // A broken customiser setup: the shoe can't be customised at the moment.
    if (error instanceof CatalogueDataError) return CUSTOMISATION_UNAVAILABLE_MESSAGE;
    throw error;
  }
  // No customiser, or switched off in admin (is_customizable).
  if (!config || !config.customizable) return CUSTOMISATION_UNAVAILABLE_MESSAGE;
  const options = { partIds: config.parts.map((p) => p.id), colourIds: config.colours.map((c) => c.id) };
  return designMatches(design, options) ? null : STALE_DESIGN_MESSAGE;
}
