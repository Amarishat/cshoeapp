import { cn } from "@/lib/cn";

export interface BarListItem {
  key: string;
  label: string;
  /** Secondary text under the label, e.g. a category or a share. */
  detail?: string;
  /** What the bar's length encodes. */
  value: number;
  /** The value as shown, e.g. "12 units". */
  valueLabel: string;
  /** Optional second figure under the value, e.g. revenue. */
  subValueLabel?: string;
}

/**
 * Horizontal bars, one per row, each labelled with its value in text — so the
 * bars only illustrate and nothing is read from colour or length alone.
 * Lengths are relative to the largest value (or `max`, when given).
 */
export function BarList({
  items,
  label,
  max,
  className,
}: {
  items: BarListItem[];
  /** Accessible name for the list. */
  label: string;
  max?: number;
  className?: string;
}) {
  const scale = max ?? Math.max(0, ...items.map((item) => item.value));

  return (
    <ul aria-label={label} className={cn("flex flex-col gap-4", className)}>
      {items.map((item) => {
        const share = scale > 0 ? Math.min(1, item.value / scale) : 0;
        return (
          <li key={item.key}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="min-w-0">
                <span className="block truncate text-label font-medium" title={item.label}>
                  {item.label}
                </span>
                {item.detail && <span className="block text-caption text-ink/50">{item.detail}</span>}
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-label font-medium tabular-nums">{item.valueLabel}</span>
                {item.subValueLabel && (
                  <span className="block text-caption text-ink/50 tabular-nums">{item.subValueLabel}</span>
                )}
              </span>
            </div>
            {/* Track + bar: square at the start, 4px rounded at the data end. */}
            <div aria-hidden className="mt-2 h-2 rounded-r-sm bg-surface">
              {share > 0 && (
                // At least 4px, so a small non-zero value is never invisible.
                <div className="h-full min-w-1 rounded-r-sm bg-primary" style={{ width: `${share * 100}%` }} />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
