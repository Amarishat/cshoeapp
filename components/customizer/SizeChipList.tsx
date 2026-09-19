"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

/**
 * Vertical, scrolling UK size chips (Figma 1:6617): 54×36, 12px radius,
 * #DEE3EB outline (black when selected), Inter Medium 14, 15px gaps.
 */
export function SizeChipList({
  sizes,
  value,
  onChange,
  labelledBy,
  className,
  style,
}: {
  sizes: number[];
  /** `null` = nothing chosen yet (the first chip takes keyboard focus). */
  value: number | null;
  onChange: (size: number) => void;
  labelledBy: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusIndex = Math.max(0, sizes.findIndex((s) => s === value));

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
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
      aria-labelledby={labelledBy}
      className={cn(
        "no-scrollbar flex h-[214px] w-[57px] snap-y snap-mandatory flex-col gap-[15px] overflow-y-auto p-px",
        className,
      )}
      style={style}
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
            tabIndex={index === focusIndex ? 0 : -1}
            onClick={() => onChange(size)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "flex h-9 w-[54px] shrink-0 snap-start items-center justify-center rounded-xl border-[0.825px] bg-white text-sm font-medium tracking-[0.2475px]",
              selected ? "border-ink text-ink" : "border-[#dee3eb] text-[#1f2732]",
            )}
          >
            UK {size}
          </button>
        );
      })}
    </div>
  );
}
