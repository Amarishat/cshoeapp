"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";

const THUMB = 24; // px, Figma "Bullet"

// Two native range inputs stacked on one track; only their thumbs take pointer events.
const input = cn(
  "pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent outline-none",
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#2280ef] [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgba(0,0,0,0.25)]",
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#2280ef] [&::-moz-range-thumb]:shadow-[0_1px_3px_rgba(0,0,0,0.25)]",
  "focus-visible:[&::-webkit-slider-thumb]:outline-2 focus-visible:[&::-webkit-slider-thumb]:outline-offset-2 focus-visible:[&::-webkit-slider-thumb]:outline-ink",
);

const field =
  "flex h-12 w-[121px] min-w-0 items-center gap-0.5 rounded-[20px] border border-[#8b8b8b] px-3 text-base focus-within:border-ink";

/**
 * Two-handle range slider with editable min/max fields (Figma "Range Slider",
 * 1:5930): #C0DBFB track, #2280EF active range, 24px blue handles with a white
 * ring, and two 121×48 "₹" fields below. Values are clamped to [min, max] and
 * can never cross. Fields update the slider as you type valid values and are
 * clamped on blur.
 */
export function RangeSlider({
  min,
  max,
  value,
  onChange,
  labels = ["Minimum", "Maximum"],
  formatValue = String,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  labels?: [string, string];
  /** For screen readers, e.g. "₹1,700". */
  formatValue?: (n: number) => string;
}) {
  const [low, high] = value;
  const [drafts, setDrafts] = useState<[string | null, string | null]>([null, null]);
  const span = max - min || 1;
  const pct = (n: number) => (n - min) / span;
  // Active segment runs between the thumb centres (native thumbs stay inside the input).
  const active: CSSProperties = {
    left: `calc(${THUMB / 2}px + ${pct(low)} * (100% - ${THUMB}px))`,
    width: `calc(${pct(high) - pct(low)} * (100% - ${THUMB}px))`,
  };
  // When the handles overlap, the one that can still move goes on top.
  const lowOnTop = low > min + span / 2;

  function setLow(n: number) {
    onChange([Math.min(Math.max(n, min), high), high]);
  }
  function setHigh(n: number) {
    onChange([low, Math.max(Math.min(n, max), low)]);
  }

  function onFieldChange(index: 0 | 1, text: string) {
    const digits = text.replace(/\D/g, "");
    setDrafts((d) => (index === 0 ? [digits, d[1]] : [d[0], digits]));
    const n = Number(digits);
    if (digits === "") return;
    if (index === 0 && n >= min && n <= high) onChange([n, high]);
    if (index === 1 && n <= max && n >= low) onChange([low, n]);
  }

  function onFieldBlur(index: 0 | 1) {
    const text = drafts[index];
    if (text !== null && text !== "") {
      if (index === 0) setLow(Number(text));
      else setHigh(Number(text));
    }
    setDrafts((d) => (index === 0 ? [null, d[1]] : [d[0], null]));
  }

  return (
    <div>
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-[5px] bg-[#c0dbfb]" />
        <div className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-[5px] bg-[#2280ef]" style={active} />
        <input
          type="range"
          min={min}
          max={max}
          value={low}
          aria-label={labels[0]}
          aria-valuetext={formatValue(low)}
          onChange={(e) => setLow(Number(e.target.value))}
          className={cn(input, lowOnTop ? "z-20" : "z-10")}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={high}
          aria-label={labels[1]}
          aria-valuetext={formatValue(high)}
          onChange={(e) => setHigh(Number(e.target.value))}
          className={cn(input, "z-[15]")}
        />
      </div>

      <div className="mt-[17px] flex items-center justify-between gap-3">
        {([0, 1] as const).map((index) => (
          <div key={index} className="contents">
            {index === 1 && <span aria-hidden className="h-px w-2 shrink-0 bg-[#8b8b8b]" />}
            <label className={field}>
              <span className="font-bold text-[#8b8b8b]">₹</span>
              <input
                inputMode="numeric"
                aria-label={labels[index]}
                value={drafts[index] ?? String(value[index])}
                onChange={(e) => onFieldChange(index, e.target.value)}
                onBlur={() => onFieldBlur(index)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                className="w-full min-w-0 bg-transparent outline-none"
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
