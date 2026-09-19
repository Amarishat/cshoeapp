"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

/**
 * Horizontally scrolling size circles (Figma 1:2531): 55px, #CCC outline,
 * 18px gaps, Inter 19; the selected size is black with white text.
 */
export function SizeSelector({
  sizes,
  labelFor,
  value,
  onChange,
  ariaLabel,
}: {
  /** Size values (UK); `labelFor` turns each into the label for the current system. */
  sizes: number[];
  labelFor: (size: number) => string;
  value: number;
  onChange: (size: number) => void;
  ariaLabel: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + sizes.length) % sizes.length;
    refs.current[next]?.focus();
    onChange(sizes[next]);
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="no-scrollbar flex snap-x snap-mandatory scroll-px-gutter gap-[18px] overflow-x-auto px-gutter"
    >
      {sizes.map((size, index) => {
        const selected = size === value;
        return (
          <button
            key={size}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(size)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "flex size-[55px] shrink-0 snap-start items-center justify-center rounded-full border border-border text-body",
              selected ? "bg-ink text-white" : "bg-white text-ink",
            )}
          >
            {labelFor(size)}
          </button>
        );
      })}
    </div>
  );
}
