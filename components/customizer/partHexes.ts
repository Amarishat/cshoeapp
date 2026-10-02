import type { CustomizationColour, CustomizationSelection } from "@/lib/types";

/**
 * A design (part id → colour id) as the colours to show (part id → hex). A
 * colour the customiser no longer has is left out, so that part stays as
 * modelled. Kept apart from shoeModel so callers don't pull in three.
 */
export function partHexes(
  selection: CustomizationSelection,
  colours: readonly CustomizationColour[],
): Record<string, string> {
  const hexes: Record<string, string> = {};
  for (const [partId, colourId] of Object.entries(selection)) {
    const colour = colours.find((c) => c.id === colourId);
    if (colour) hexes[partId] = colour.hex;
  }
  return hexes;
}
