"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface ColumnPoint {
  key: string;
  /** Full label for the tooltip and table, e.g. "24 Sep 2026". */
  label: string;
  /** Short axis label, e.g. "24 Sep". */
  tickLabel: string;
  value: number;
  /** Extra line for the tooltip and table, e.g. "3 orders". */
  detail?: string;
}

/** Clean axis ticks from 0 up to at least `max` (e.g. 0 / 5K / 10K / 15K). */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const n = raw / magnitude;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * magnitude;
  const ticks: number[] = [];
  for (let tick = 0; tick < max + step; tick += step) ticks.push(tick);
  return ticks;
}

const PLOT_HEIGHT = "h-[200px]";
/** The y-axis column's width (w-12); the tooltip may extend over it. */
const AXIS_WIDTH = 48;

/**
 * A column per point on one value axis, for a short continuous timeline.
 * Every point keeps its slot — a zero is drawn as a flat stub on the
 * baseline — and only every `tickEvery`-th axis label (counted back from the
 * last point) is shown, so the dates don't crowd. Hover or arrow keys show one
 * point's value; the same numbers are in the table under the chart.
 */
export function ColumnChart({
  points,
  label,
  formatValue,
  formatTick,
  valueHeading,
  detailHeading,
  tickEvery = 7,
}: {
  points: ColumnPoint[];
  /** What the chart shows, used as its accessible name. */
  label: string;
  /** Tooltip and table values, e.g. "₹12,345". */
  formatValue: (value: number) => string;
  /** Axis tick values, e.g. "12K". */
  formatTick: (value: number) => string;
  valueHeading: string;
  detailHeading?: string;
  tickEvery?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const readoutId = useId();
  const plotRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const ticks = niceTicks(Math.max(0, ...points.map((p) => p.value)));
  const top = ticks.at(-1) || 1;
  const last = points.length - 1;
  const showTick = (i: number) => (last - i) % tickEvery === 0;
  const activePoint = active === null ? null : points[active];

  // Centre the tooltip over its column, but never past the y-axis on the left
  // or the plot's right edge, so it stays on screen however narrow the chart is.
  useLayoutEffect(() => {
    const plot = plotRef.current;
    const tooltip = tooltipRef.current;
    if (active === null || !plot || !tooltip) return;
    const plotWidth = plot.clientWidth;
    const width = tooltip.offsetWidth;
    const centre = ((active + 0.5) / points.length) * plotWidth;
    tooltip.style.left = `${Math.max(-AXIS_WIDTH, Math.min(centre - width / 2, plotWidth - width))}px`;
  }, [active, points.length]);

  function onKeyDown(event: KeyboardEvent) {
    const moves: Record<string, number> = {
      ArrowLeft: (active ?? last + 1) - 1,
      ArrowRight: (active ?? -1) + 1,
      Home: 0,
      End: last,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setActive(Math.min(last, Math.max(0, next)));
  }

  return (
    <div>
      {/* Room above the plot for the tooltip over the tallest column. */}
      <div className="flex pt-14">
        {/* Y axis */}
        <div aria-hidden className={cn("relative shrink-0", PLOT_HEIGHT)} style={{ width: AXIS_WIDTH }}>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-2 translate-y-1/2 text-caption text-ink/50 tabular-nums"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              {formatTick(tick)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div
            ref={plotRef}
            role="group"
            aria-label={`${label}. Use the left and right arrow keys to read each day.`}
            aria-describedby={readoutId}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onFocus={() => setActive((i) => i ?? last)}
            onBlur={() => setActive(null)}
            onPointerLeave={() => setActive(null)}
            className={cn(
              "relative rounded-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary",
              PLOT_HEIGHT,
            )}
          >
            {/* Gridlines; the baseline is one step stronger. */}
            {ticks.map((tick) => (
              <div
                key={tick}
                aria-hidden
                className={cn("absolute inset-x-0 border-t", tick === 0 ? "border-border" : "border-gray-5")}
                style={{ bottom: `${(tick / top) * 100}%` }}
              />
            ))}

            <div aria-hidden className="absolute inset-0 flex">
              {points.map((point, i) => {
                const height = (point.value / top) * 100;
                return (
                  <div
                    key={point.key}
                    onPointerEnter={() => setActive(i)}
                    className="flex h-full flex-1 items-end justify-center"
                  >
                    {point.value > 0 ? (
                      <div
                        className={cn(
                          "w-[min(24px,calc(100%-2px))] min-h-1 rounded-t-sm bg-primary transition-opacity",
                          active === i && "opacity-70",
                        )}
                        style={{ height: `${height}%` }}
                      />
                    ) : (
                      // An empty day keeps its slot: a flat stub on the baseline.
                      <div
                        className={cn(
                          "h-[3px] w-[min(24px,calc(100%-2px))]",
                          active === i ? "bg-gray-4" : "bg-gray-5",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {activePoint && active !== null && (
              <div
                ref={tooltipRef}
                aria-hidden
                className="pointer-events-none absolute left-0 z-10 w-max max-w-[220px] rounded-input border border-border bg-page px-3 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                // Horizontal position is set by the layout effect above.
                style={{ bottom: `calc(${(activePoint.value / top) * 100}% + 8px)` }}
              >
                <p className="text-label font-semibold tabular-nums">{formatValue(activePoint.value)}</p>
                <p className="text-caption text-ink/60">
                  {activePoint.label}
                  {activePoint.detail && ` · ${activePoint.detail}`}
                </p>
              </div>
            )}
          </div>

          {/* X axis: a label every `tickEvery` points, counted back from the last. */}
          <div aria-hidden className="mt-2 flex h-4">
            {points.map((point, i) => (
              <div key={point.key} className="relative flex-1">
                {showTick(i) && (
                  <span
                    className={cn(
                      "absolute top-0 text-caption whitespace-nowrap text-ink/50",
                      i === last ? "right-0" : "left-1/2 -translate-x-1/2",
                    )}
                  >
                    {point.tickLabel}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p id={readoutId} aria-live="polite" className="sr-only">
        {activePoint
          ? `${activePoint.label}: ${formatValue(activePoint.value)}${activePoint.detail ? `, ${activePoint.detail}` : ""}`
          : ""}
      </p>

      <details className="mt-4 text-secondary">
        <summary className="cursor-pointer text-ink/60 underline decoration-transparent hover:decoration-inherit">
          Show as table
        </summary>
        <div className="mt-3 max-h-[280px] overflow-y-auto rounded-input border border-border">
          <table className="w-full border-collapse text-label">
            <caption className="sr-only">{label}</caption>
            <thead className="sticky top-0 bg-page">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-secondary font-medium text-ink/60">
                  Day
                </th>
                {detailHeading && (
                  <th scope="col" className="px-4 py-2 text-right text-secondary font-medium text-ink/60">
                    {detailHeading}
                  </th>
                )}
                <th scope="col" className="px-4 py-2 text-right text-secondary font-medium text-ink/60">
                  {valueHeading}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((point) => (
                <tr key={point.key} className="border-t border-border">
                  <th scope="row" className="px-4 py-2 text-left font-normal whitespace-nowrap">
                    {point.label}
                  </th>
                  {detailHeading && <td className="px-4 py-2 text-right tabular-nums">{point.detail}</td>}
                  <td className="px-4 py-2 text-right tabular-nums">{formatValue(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
