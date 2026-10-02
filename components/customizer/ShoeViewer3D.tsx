"use client";

import dynamic from "next/dynamic";
import { useMemo, type ReactNode } from "react";
import { bannerUnit, u } from "@/components/home/banner";
import type { CustomizationColour, CustomizationSelection } from "@/lib/types";
import { partHexes } from "./partHexes";

/** The design width/height of the viewer area in Figma 1:6606 (y 107–634), as ShoeViewer. */
const DESIGN_W = 430;
const DESIGN_H = 528;

/** The shoe's area: everything above the Try On button (top 496). */
const CANVAS_H = 480;

/** Loaded in the browser only: WebGL can't render on the server. */
const ShoeCanvas3D = dynamic(() => import("./ShoeCanvas3D").then((m) => m.ShoeCanvas3D), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <p className="text-secondary text-ink/60">Loading shoe…</p>
    </div>
  ),
});

/**
 * Customiser 3D shoe viewer, in place of ShoeViewer's image (Figma 1:6606,
 * y 107–634): the faded brand wordmark behind a 3D shoe shown in the current
 * design. Display only: `selection` (part id → colour id) is resolved to the
 * customiser's colour hexes, and parts with no colour stay as modelled.
 *
 * `children` are overlaid in the same coordinate space (use `u()`), as in ShoeViewer.
 */
export function ShoeViewer3D({
  selection,
  colours,
  wordmark,
  children,
}: {
  selection: CustomizationSelection;
  colours: CustomizationColour[];
  wordmark: string;
  children?: ReactNode;
}) {
  const hexByPart = useMemo(() => partHexes(selection, colours), [selection, colours]);

  return (
    <div className="@container">
      <div
        className="relative overflow-x-clip bg-white"
        style={{ ...bannerUnit(DESIGN_W), height: u(DESIGN_H) }}
      >
        {/* Faded, rotated brand wordmark (Inter Black Italic, 10% black), as ShoeViewer. */}
        <p
          aria-hidden
          className="absolute font-black whitespace-nowrap text-black/10 italic"
          style={{
            left: u(352.8),
            top: u(184),
            fontSize: u(120),
            transform: "translate(-50%, -50%) rotate(90.13deg)",
          }}
        >
          {wordmark}
        </p>

        <div
          role="img"
          aria-label="3D view of your design. Drag to rotate, pinch or scroll to zoom."
          className="absolute inset-x-0 top-0"
          style={{ height: u(CANVAS_H) }}
        >
          <ShoeCanvas3D hexByPart={hexByPart} />
        </div>

        {children}
      </div>
    </div>
  );
}
