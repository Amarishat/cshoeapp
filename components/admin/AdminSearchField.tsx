"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/*
 * The compact controls the admin list toolbars are built from. Shared so the
 * Products and Brands toolbars stay identical; neither one queries Supabase.
 */

/** One toolbar control: 36px tall, admin borders, not the customer form fields. */
export const adminField =
  "h-9 w-full rounded-[9px] border border-border bg-page px-3 text-secondary text-ink " +
  "focus:border-ink focus:outline-none";

/** Toolbar button, matching the table's Edit action. */
export const adminToolbarButton =
  "h-9 rounded-[9px] border border-border px-3 text-secondary font-medium hover:bg-surface";

/** Labelled search box for a list toolbar. */
export function AdminSearchField({
  label = "Search",
  placeholder,
  value,
  onChange,
  className,
}: {
  label?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-caption text-ink/50">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(adminField, "placeholder:text-ink/40")}
      />
    </div>
  );
}

/** True when every whitespace-separated term appears in the searched text. */
export function matchesTerms(haystack: string, search: string): boolean {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const text = haystack.toLowerCase();
  return terms.every((term) => text.includes(term));
}
