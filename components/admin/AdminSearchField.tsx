"use client";

import { useId } from "react";
import { Icon } from "@/components/ui/Icon";
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

/** Labelled dropdown for a list toolbar, sized like the search box. */
export function AdminSelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-caption text-ink/50">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className={cn(adminField, "appearance-none truncate pr-9")}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevronDown"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-40"
        />
      </div>
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
