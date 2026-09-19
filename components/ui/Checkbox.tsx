"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TICK_21x20 =
  "M17 6.05145L8.08571 15L4 10.8986L5.04743 9.84713L8.08571 12.8896L15.9526 5L17 6.05145Z";

/**
 * Checkbox, black rounded square with a white tick when checked.
 * - `bag` (Figma "Group 225"): 21×20, 2.5px radius. Figma has no unchecked
 *   design, so unchecked is the same square outlined in black.
 * - `form` (Address "Make as default address"): 22×22, 3px radius, outlined
 *   when unchecked (as in Figma); checked uses the Bag fill and tick.
 *
 * Pass `children` for a visible label (the text is part of the hit area);
 * otherwise `label` is used as the accessible name.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  variant = "bag",
  children,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  variant?: "bag" | "form";
  children?: ReactNode;
  className?: string;
}) {
  const box =
    variant === "bag" ? (
      <svg viewBox="0 0 21 20" width="21" height="20" aria-hidden className="block shrink-0">
        <rect x="0.5" y="0.5" width="20" height="19" rx="2.5" fill={checked ? "black" : "white"} stroke="black" />
        {checked && <path d={TICK_21x20} fill="white" />}
      </svg>
    ) : (
      <svg viewBox="0 0 22 22" width="22" height="22" aria-hidden className="block shrink-0">
        <rect x="0.5" y="0.5" width="21" height="21" rx="3" fill={checked ? "black" : "white"} stroke="black" />
        {checked && <path d={TICK_21x20} transform="translate(0.5 1)" fill="white" />}
      </svg>
    );

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={children ? undefined : label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative flex shrink-0 items-start after:absolute after:-inset-3 after:content-['']",
        children != null && "gap-[15px] text-left",
        className,
      )}
    >
      {box}
      {children}
    </button>
  );
}
