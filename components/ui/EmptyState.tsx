import { cn } from "@/lib/cn";
import { ButtonLink } from "./Button";
import { Icon, type IconName } from "./Icon";

/**
 * Empty list state (not in Figma): muted icon, short title and an optional
 * primary button. Used by Bag, Wishlist and Shop. `compact` is for an empty
 * section inside a longer page rather than a whole screen.
 */
export function EmptyState({
  icon,
  title,
  actionLabel,
  actionHref,
  compact = false,
}: {
  icon: IconName;
  title: string;
  actionLabel?: string;
  actionHref?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center px-gutter text-center",
        compact ? "py-12" : "pt-24 pb-32",
      )}
    >
      <Icon name={icon} className="size-12 text-ink/30" />
      <h2 className="mt-4 max-w-full text-body font-medium [overflow-wrap:anywhere]">{title}</h2>
      {actionLabel && actionHref && (
        <ButtonLink href={actionHref} size="lg" className="mt-8 w-[222px]">
          {actionLabel}
        </ButtonLink>
      )}
    </div>
  );
}
