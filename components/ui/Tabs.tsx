"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface TabItem<T extends string> {
  value: T;
  label: string;
}

/**
 * Men / Women / Kids style tabs (Figma Home "Group 33383"): Inter Medium 19,
 * 44px gaps, inactive at 50% opacity, 2px black underline under the active
 * label, then a 0.5px #CCC divider with a soft shadow.
 */
export function Tabs<T extends string>({
  items,
  value,
  onValueChange,
  ariaLabel,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + items.length) % items.length;
    refs.current[next]?.focus();
    onValueChange(items[next].value);
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={ariaLabel} className="flex gap-[44px] px-gutter">
        {items.map((item, index) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onValueChange(item.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "relative pb-3 text-body leading-[23px] font-medium",
                !selected && "opacity-50",
              )}
            >
              {item.label}
              {selected && (
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-ink" />
              )}
            </button>
          );
        })}
      </div>
      <div aria-hidden className="mt-px h-[0.5px] bg-border/70 shadow-[0_2px_4px_rgba(0,0,0,0.25)]" />
    </div>
  );
}
