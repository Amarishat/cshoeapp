"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { CustomizationColour } from "@/lib/types";

/**
 * Colour row (Figma 1:6676): six 43×40 ellipses spread over 353px. The
 * selected swatch gets a thin black ring (Figma has no selected state).
 */
export function ColourSwatches({
  colours,
  value,
  onChange,
  partName,
}: {
  colours: CustomizationColour[];
  value?: string;
  onChange: (colourId: string) => void;
  partName: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusIndex = Math.max(
    0,
    colours.findIndex((c) => c.id === value),
  );

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + colours.length) % colours.length;
    refs.current[next]?.focus();
    onChange(colours[next].id);
  }

  return (
    <div
      role="radiogroup"
      aria-label={`${partName} colour`}
      className="mx-auto flex w-full max-w-[353px] justify-between"
    >
      {colours.map((colour, index) => {
        const selected = colour.id === value;
        return (
          <button
            key={colour.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={colour.name}
            tabIndex={index === focusIndex ? 0 : -1}
            onClick={() => onChange(colour.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "h-10 w-[43px] shrink-0 rounded-full outline-offset-[3px]",
              selected && "outline-2 outline-ink",
            )}
            style={{ backgroundColor: colour.hex }}
          />
        );
      })}
    </div>
  );
}
