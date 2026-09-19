import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { OrderNotification } from "@/lib/notifications";

/**
 * One notification row (Figma 1:6944 / 1:6867): 45px #F5F5F5 circle with an
 * icon, title (Medium 16) and body (Regular 13, max 2 lines). Unread rows sit
 * on #FAFAFA (1:6867); read rows are greyed (1:6944). The whole row opens the
 * order and marks it read.
 */
export function NotificationItem({
  notification,
  unread,
  onOpen,
}: {
  notification: OrderNotification;
  unread: boolean;
  onOpen: () => void;
}) {
  return (
    <Link
      href={`/orders/${encodeURIComponent(notification.orderId)}`}
      onClick={onOpen}
      className={cn("flex gap-3 px-gutter py-[13px]", unread && "bg-[#fafafa]")}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-[45px] shrink-0 items-center justify-center rounded-full bg-surface",
          unread ? "text-ink" : "text-ink/35",
        )}
      >
        <Icon name="bag" className="size-[22px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-base font-medium", unread ? "text-[#323b48]" : "text-ink/40")}>
          {unread && <span className="sr-only">Unread: </span>}
          {notification.title}
        </span>
        {/* Order ids are long unbroken strings, so allow breaking anywhere. */}
        <span
          className={cn(
            "mt-1.5 line-clamp-2 text-[13px] [overflow-wrap:anywhere]",
            unread ? "text-[#4a5568]" : "text-ink/35",
          )}
        >
          {notification.body}
        </span>
      </span>
    </Link>
  );
}
