import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/**
 * Neutral stand-in for a profile photo (no user photos exist in V1). Size and
 * shape come from `className`, e.g. a circle on Account, a rounded square in
 * the Drawer. The icon scales with the box.
 */
export function AvatarPlaceholder({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex items-center justify-center border border-border bg-surface", className)}
    >
      <Icon name="user" className="size-[52%] text-ink/30" />
    </span>
  );
}
