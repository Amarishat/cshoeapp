"use client";

import { Icon } from "@/components/ui/Icon";
import type { CustomizationColour, CustomizationPart } from "@/lib/types";

/**
 * Part picker bar (Figma 1:6668–1:6683): white 74px panel with a 39×2 grab
 * handle, 30px ep:back arrows and "Part n/12" (Inter Medium 17, count #CCC).
 * Wraps around at both ends. A small dot shows the colour saved for the part.
 */
export function PartStepper({
  parts,
  index,
  onIndexChange,
  colour,
}: {
  parts: CustomizationPart[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Colour saved for the current part, if any. */
  colour?: CustomizationColour;
}) {
  const step = (delta: number) => onIndexChange((index + delta + parts.length) % parts.length);
  const part = parts[index];

  return (
    <div className="h-[74px] bg-white pt-[15px]">
      <div aria-hidden className="mx-auto h-[2px] w-[39px] rounded-full bg-border" />
      <div className="mt-[13px] flex items-center justify-between pr-[41px] pl-[38px]">
        <button type="button" aria-label="Previous part" onClick={() => step(-1)} className="flex">
          <Icon name="back" className="size-[30px]" />
        </button>
        <p aria-live="polite" className="flex items-center gap-2 text-label font-medium">
          <span>{part.name}</span>
          {colour && (
            <span
              className="size-2.5 rounded-full ring-1 ring-black/15"
              style={{ backgroundColor: colour.hex }}
              title={colour.name}
            >
              <span className="sr-only">, {colour.name}</span>
            </span>
          )}
          <span className="text-border">
            <span className="sr-only">, part </span>
            {index + 1}/{parts.length}
          </span>
        </p>
        <button type="button" aria-label="Next part" onClick={() => step(1)} className="flex">
          <Icon name="back" className="size-[30px] rotate-180" />
        </button>
      </div>
    </div>
  );
}
