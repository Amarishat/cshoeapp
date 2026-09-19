import { cn } from "@/lib/cn";

/** Small grey pill marking a visible-but-unavailable V1 action. */
export function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-ink/60",
        className,
      )}
    >
      Coming Soon
    </span>
  );
}
