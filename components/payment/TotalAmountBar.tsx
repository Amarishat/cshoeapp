"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatAmount, type BagTotals } from "@/lib/pricing";

/**
 * "Total Amount" bar (Figma 1:4864): 390×66, #F5F5F5, #CCC outline, 3px
 * radius, Regular 22 label with a chevron, SemiBold 17 amount. The chevron
 * expands the same price breakdown as Bag / Order Summary.
 */
export function TotalAmountBar({ totals }: { totals: BagTotals }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rows: [string, number][] = [
    [`Price (${totals.selectedQuantity} ${totals.selectedQuantity === 1 ? "item" : "items"})`, totals.subtotal],
    ["Discount", 0],
    ["Delivery Charges", totals.delivery],
    ["Platform Fee", totals.platformFee],
  ];

  return (
    <div className="rounded-[3px] border border-border bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="flex h-16 w-full items-center justify-between pr-[19px] pl-[18px]"
      >
        <span className="flex items-center gap-[21px] text-heading">
          Total Amount
          <Icon name={open ? "chevronUp" : "chevronDown"} className="size-5" />
        </span>
        <span className="text-[17px] font-semibold">{formatAmount(totals.total)}</span>
      </button>
      <div id={panelId} role="region" aria-label="Price breakdown" hidden={!open} className="px-[18px] pb-4">
        <dl className="flex flex-col gap-[10px] border-t border-border pt-4 text-[17px]">
          {rows.map(([label, amount]) => (
            <div key={label} className="flex items-center justify-between">
              <dt className="text-ink/70">{label}</dt>
              <dd className={label.startsWith("Price") ? "font-medium" : "text-ink/70"}>
                {formatAmount(amount)}
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <dt className="font-medium">Total Amount</dt>
            <dd className="font-semibold">{formatAmount(totals.total)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
