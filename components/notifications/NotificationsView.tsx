"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { groupByDay, orderNotifications } from "@/lib/notifications";
import { useNotificationsStore } from "@/lib/store/notifications";
import { useOrdersStore } from "@/lib/store/orders";
import { useStoreHydrated } from "@/lib/store/useStoreHydrated";
import { NotificationItem } from "./NotificationItem";

/**
 * Notifications — Figma 1:6944 (default) / 1:6867 (unread highlight). V1
 * content is derived only from real orders in the Orders store: one "Order
 * confirmed" notification per order, grouped by day. Only read order ids are
 * stored. Figma's marketing notifications are not used.
 */
export function NotificationsView() {
  const ordersReady = useStoreHydrated(useOrdersStore.persist);
  const readReady = useStoreHydrated(useNotificationsStore.persist);
  const orders = useOrdersStore((s) => s.orders);
  const readOrderIds = useNotificationsStore((s) => s.readOrderIds);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);

  const ready = ordersReady && readReady;
  const notifications = orderNotifications(orders);
  const unreadIds = notifications.map((n) => n.orderId).filter((id) => !readOrderIds.includes(id));
  const days = groupByDay(notifications);

  return (
    <div className="flex flex-1 flex-col pb-10">
      <AppHeader
        title="Notifications"
        actions={
          <button
            type="button"
            disabled={!ready || unreadIds.length === 0}
            onClick={() => markAllRead(unreadIds)}
            className="text-[15px] whitespace-nowrap disabled:text-ink/30"
          >
            Mark all as read
          </button>
        }
      />
      {/* Figma 1:6948: #CCC 70% line under the header */}
      <hr className="mt-4 border-border/70" />

      {/* Wait for the saved orders/read state so the list doesn't flash. */}
      {ready &&
        (days.length === 0 ? (
          <EmptyState icon="bell" title="No notifications yet" actionLabel="Continue Shopping" actionHref="/" />
        ) : (
          <div>
            {days.map((day, i) => (
              <section
                key={day.key}
                aria-labelledby={`notifications-${day.key}`}
                // Figma 1:6965: thin divider between date groups
                className={i > 0 ? "mx-gutter border-t border-[#4a5568]/20" : undefined}
              >
                <h2
                  id={`notifications-${day.key}`}
                  className={i > 0 ? "pt-[22px] pb-2" : "px-gutter pt-[29px] pb-2"}
                >
                  <span className="text-[13px] font-medium text-[#4a5568]/70">{day.label}</span>
                </h2>
                <ul className={i > 0 ? "-mx-gutter" : undefined}>
                  {day.items.map((n) => (
                    <li key={n.orderId}>
                      <NotificationItem
                        notification={n}
                        unread={unreadIds.includes(n.orderId)}
                        onOpen={() => markRead(n.orderId)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ))}
    </div>
  );
}
