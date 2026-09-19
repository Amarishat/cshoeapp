import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Horizontal product row that runs off the right edge of the screen, with
 * scroll snapping. Items are 187px wide like the Figma cards.
 */
export function ProductRail({
  children,
  gap,
  topInset = 0,
  label,
}: {
  children: ReactNode[];
  /** Figma spacing between cards: 13px in Top Picks, 15px in Customisation. */
  gap: 13 | 15;
  /** Room above the cards for heart buttons that overlap the top edge. */
  topInset?: number;
  label: string;
}) {
  return (
    <ul
      aria-label={label}
      className={cn(
        "no-scrollbar flex snap-x snap-mandatory scroll-px-gutter overflow-x-auto px-gutter",
        gap === 13 ? "gap-[13px]" : "gap-[15px]",
      )}
      style={{ paddingTop: topInset }}
    >
      {children.map((child, index) => (
        <li key={index} className="w-[187px] shrink-0 snap-start">
          {child}
        </li>
      ))}
    </ul>
  );
}
