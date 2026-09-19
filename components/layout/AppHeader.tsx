import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import type { User } from "@/lib/types";
import { BackButton } from "./BackButton";
import { DrawerMenu } from "./DrawerMenu";

/**
 * Screen header: leading control, title, trailing actions (Figma: 30px icons,
 * 15px gaps, Inter 22/32 title). The top padding replaces the iOS status bar
 * area that the Figma frames reserve above the header.
 */
export function AppHeader({
  leading = "none",
  backHref,
  backAlwaysToHref = false,
  menuUser,
  title,
  titleClassName,
  actions,
  className,
}: {
  leading?: "menu" | "back" | "none";
  /** Where the back button goes if there is no history. */
  backHref?: string;
  /** Always go to `backHref` instead of browser history (e.g. Account → Home). */
  backAlwaysToHref?: boolean;
  /** With `leading="menu"`: the user shown in the side drawer the button opens. */
  menuUser?: Pick<User, "firstName" | "city">;
  title?: ReactNode;
  titleClassName?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-center gap-[15px] px-gutter pt-[max(env(safe-area-inset-top),12px)] pb-2",
        className,
      )}
    >
      {leading === "menu" &&
        (menuUser ? (
          <DrawerMenu user={menuUser} />
        ) : (
          // Without a user there is no drawer to open (e.g. UI previews).
          <button type="button" aria-label="Open menu" className="-m-[7px] flex p-[7px]">
            <Icon name="menu" className="size-[30px]" />
          </button>
        ))}
      {leading === "back" && <BackButton fallbackHref={backHref} alwaysFallback={backAlwaysToHref} />}

      <h1 className={cn("min-w-0 flex-1 truncate text-heading font-normal", titleClassName)}>
        {title}
      </h1>

      {actions && <div className="flex shrink-0 items-center gap-[15px]">{actions}</div>}
    </header>
  );
}
