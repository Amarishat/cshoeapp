"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { SizeChartColumn } from "@/lib/data/sizeChart";

type Unit = "cm" | "in";

/** Empty cell for values Figma doesn't provide. */
function Unavailable() {
  return (
    <>
      <span aria-hidden className="text-ink/30">
        —
      </span>
      <span className="sr-only">Not available</span>
    </>
  );
}

// Row heights from Figma: 66 / 56 / 66 / 66 / 67.
const rows: { label: string; height: string; value: (c: SizeChartColumn) => number }[] = [
  { label: "US - Men’s", height: "h-[66px]", value: (c) => c.us },
  { label: "UK - Men’s", height: "h-[56px]", value: (c) => c.uk },
  { label: "US - Women’s", height: "h-[66px]", value: (c) => c.us },
  { label: "UK - Women’s", height: "h-[66px]", value: (c) => c.uk },
];

// Data cells are `relative` so their sr-only text stays inside the scroll container.
const cell = "border-r border-b border-border";

/**
 * cm / in toggle and the size table (Figma 1:2612–1:2642). The label column
 * stays put while the size columns scroll sideways to the screen edge.
 */
export function SizeChartTable({ columns }: { columns: SizeChartColumn[] }) {
  const [unit, setUnit] = useState<Unit>("cm");

  return (
    <>
      <div role="group" aria-label="Measurement unit" className="flex gap-2 px-gutter">
        {(["cm", "in"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={unit === value}
            onClick={() => setUnit(value)}
            className={cn(
              "flex h-8 w-[65px] items-center justify-center rounded-[19.5px] border border-border text-secondary font-medium",
              unit === value ? "bg-surface" : "bg-white",
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="Size chart, scrolls sideways"
        className="no-scrollbar mt-6 ml-gutter overflow-x-auto"
      >
        <table className="border-separate border-spacing-0 bg-white text-body">
          <caption className="sr-only">
            Shoe sizes: US and UK, men’s and women’s, with foot length
          </caption>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.label}>
                <th
                  scope="row"
                  className={cn(
                    cell,
                    row.height,
                    "sticky left-0 z-10 w-[199px] min-w-[199px] border-l bg-white pl-[30px] text-left font-medium whitespace-nowrap",
                    rowIndex === 0 && "border-t",
                  )}
                >
                  {row.label}
                </th>
                {columns.map((column) => (
                  <td
                    key={column.uk}
                    className={cn(cell, "relative w-[131px] min-w-[131px] text-center", rowIndex === 0 && "border-t")}
                  >
                    {row.value(column)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th
                scope="row"
                className={cn(
                  cell,
                  "sticky left-0 z-10 h-[67px] border-l bg-white text-center font-medium",
                )}
              >
                Foot Length
                <br />({unit})
              </th>
              {columns.map((column) => (
                <td key={column.uk} className={cn(cell, "relative text-center")}>
                  {unit === "cm" && column.footLengthCm !== null ? column.footLengthCm : <Unavailable />}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {unit === "in" && (
        <p role="status" className="mt-3 px-gutter text-secondary text-ink/50">
          Foot length in inches isn’t available yet.
        </p>
      )}
    </>
  );
}
