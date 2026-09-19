import type { CSSProperties } from "react";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * "Virtual Try-On" button (Figma 1:2559 / 1:6687): 219×45, #CCC outline,
 * 11px radius, 25px ion:logo-apple-ar icon, Inter Medium 19.
 *
 * V1: Coming Soon and not interactive — there is no camera/AR/3D try-on, so
 * it doesn't link anywhere. The badge sits on the top-right corner.
 */
export function TryOnButton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-disabled="true"
      className={cn(
        "relative flex h-[45px] w-[219px] items-center gap-[17px] rounded-[11px] border border-border bg-white px-[17px] text-body font-medium",
        className,
      )}
      style={style}
    >
      <Icon name="ar" className="size-[25px]" />
      <span>Virtual Try-On</span>
      <ComingSoonBadge className="absolute -top-2.5 right-2" />
    </div>
  );
}
