"use client";

import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import { FieldError } from "./TextField";

/**
 * Dropdown styled like the Address fields (Figma 1:3418): 50px, 1px black
 * border, 9px radius, 17px text, formkit chevron at 30%. The placeholder is
 * shown at 30% until a value is chosen.
 */
export function SelectField({
  label,
  placeholder,
  options,
  error,
  className,
  id,
  value,
  ...selectProps
}: {
  label: string;
  placeholder: string;
  options: string[];
  error?: string;
  value: string;
} & Omit<ComponentProps<"select">, "value">) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <label htmlFor={selectId} className="text-[17px]">
        {label}
      </label>
      <div>
        <div className="relative">
          <select
            id={selectId}
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "h-[50px] w-full appearance-none truncate rounded-input border bg-white pr-11 pl-[15px] text-[17px] disabled:cursor-not-allowed",
              value ? "text-ink" : "text-ink/30",
              error ? "border-danger" : "border-ink",
            )}
            {...selectProps}
          >
            <option value="" disabled hidden>
              {placeholder}
            </option>
            {options.map((option) => (
              <option key={option} value={option} className="text-ink">
                {option}
              </option>
            ))}
          </select>
          <Icon
            name="chevronDown"
            className="pointer-events-none absolute top-1/2 right-[15px] size-5 -translate-y-1/2 opacity-30"
          />
        </div>
        <FieldError id={errorId} message={error} />
      </div>
    </div>
  );
}
