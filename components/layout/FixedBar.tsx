import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A bar fixed to the top or bottom of the screen but kept inside the 430px app
 * column, so it lines up with the content on tablet/desktop.
 */
export function FixedBar({
  position = "bottom",
  className,
  children,
}: {
  position?: "top" | "bottom";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-40 mx-auto w-full max-w-app",
        position === "bottom" ? "bottom-0" : "top-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
