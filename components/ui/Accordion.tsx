"use client";

import { useId, type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * Collapsible row (Figma Product: "Size and Fit", "Reviews (5)", "Product
 * Information"): Inter Medium 19 title, optional trailing content, 20px
 * formkit chevron (up when open), content 10px below the title.
 */
export function Accordion({
  id,
  title,
  trailing,
  open,
  onOpenChange,
  children,
}: {
  id?: string;
  title: string;
  trailing?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const panelId = useId();

  return (
    <div id={id} className="scroll-mt-4">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onOpenChange(!open)}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <span className="text-body font-medium">{title}</span>
          <span className="flex items-center gap-[26px]">
            {trailing}
            <Icon name={open ? "chevronUp" : "chevronDown"} className="size-5" />
          </span>
        </button>
      </h3>
      <div id={panelId} role="region" hidden={!open} className="mt-[10px]">
        {children}
      </div>
    </div>
  );
}
