"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Inline field error (not in Figma): 13px, danger red, under the field. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-[13px] text-danger">
      {message}
    </p>
  );
}

/**
 * Labelled input, 1px black border, 9px radius.
 * - `lg` (Login/Signup): 63px field, 19px label, placeholder at 20%.
 * - `sm` (Address): 50px field, 17px label 16px above, 15px padding, placeholder at 30%.
 */
export function TextField({
  label,
  endAdornment,
  className,
  id,
  size = "lg",
  error,
  ...inputProps
}: {
  label: string;
  /** e.g. the password visibility toggle, placed inside the right edge. */
  endAdornment?: ReactNode;
  size?: "lg" | "sm";
  error?: string;
} & Omit<ComponentProps<"input">, "size">) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const small = size === "sm";

  return (
    <div className={cn("flex flex-col", small ? "gap-4" : "gap-2.5", className)}>
      <label htmlFor={inputId} className={small ? "text-[17px]" : "text-body"}>
        {label}
      </label>
      <div>
        <div className="relative">
          <input
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "w-full rounded-input border bg-white",
              small
                ? "h-[50px] px-[15px] text-[17px] placeholder:text-ink/30"
                : "h-[63px] px-5 text-body placeholder:text-ink/20",
              error ? "border-danger" : "border-ink",
              endAdornment ? "pr-14" : undefined,
            )}
            {...inputProps}
          />
          {endAdornment && (
            <div className="absolute inset-y-0 right-[17px] flex items-center">{endAdornment}</div>
          )}
        </div>
        <FieldError id={errorId} message={error} />
      </div>
    </div>
  );
}
