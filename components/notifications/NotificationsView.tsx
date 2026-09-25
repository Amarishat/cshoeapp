"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { EmptyState } from "@/components/ui/EmptyState";
import { groupByDay, type OrderNotification } from "@/lib/notifications";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotification,
} from "@/lib/data/userNotifications";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";
import { NotificationItem } from "./NotificationItem";

/**
 * Notifications — Figma 1:6944 (default) / 1:6867 (unread highlight). The
 * guest's notifications from Supabase ("Order confirmed" with each order,
 * "Order cancelled" when one is cancelled), grouped by day; unread = no read_at. Figma's marketing
 * notifications are not used.
 */
export function NotificationsView() {
  const { state, retry } = useCatalogueLoad(listNotifications);
  // Ids marked read in Supabase since the list was loaded (so it updates without reloading).
  const [readNow, setReadNow] = useState<ReadonlySet<string>>(() => new Set());
  const [markAllError, setMarkAllError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const ready = state.status === "ready";
  // Notifications without an order have nothing to open; only order ones are listed.
  const rows = ready ? state.data.filter((n): n is UserNotification & { orderNumber: string } => !!n.orderNumber) : [];
  const isUnread = (n: UserNotification) => n.readAt === null && !readNow.has(n.id);
  const unread = rows.filter(isUnread);
  // An order can have several notifications (confirmed, then cancelled), so they're matched by id.
  const byId = new Map(rows.map((n) => [n.id, n]));
  const days = groupByDay(
    rows.map(
      (n): OrderNotification => ({ id: n.id, orderId: n.orderNumber, createdAt: n.createdAt, title: n.title, body: n.body }),
    ),
  );

  function open(n: UserNotification) {
    if (!isUnread(n)) return;
    // Keeps running after the row's link navigates to the order.
    markNotificationRead(n.id)
      .then(() => setReadNow((ids) => new Set(ids).add(n.id)))
      .catch(() => {
        // Stays unread; it can be opened or marked read again.
      });
  }

  async function markAll() {
    setMarkingAll(true);
    setMarkAllError("");
    try {
      await markAllNotificationsRead();
      setReadNow((ids) => new Set([...ids, ...unread.map((n) => n.id)]));
    } catch (error) {
      setMarkAllError(error instanceof Error ? error.message : String(error));
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col pb-10">
      <AppHeader
        title="Notifications"
        actions={
          <button
            type="button"
            disabled={!ready || unread.length === 0 || markingAll}
            onClick={() => void markAll()}
            className="text-[15px] whitespace-nowrap disabled:text-ink/30"
          >
            Mark all as read
          </button>
        }
      />
      {/* Figma 1:6948: #CCC 70% line under the header */}
      <hr className="mt-4 border-border/70" />

      {markAllError && (
        <p role="alert" className="mt-4 px-gutter text-[15px] text-danger [overflow-wrap:anywhere]">
          {markAllError}
        </p>
      )}

      {state.status === "loading" && (
        <div aria-busy="true" aria-label="Loading notifications" className="animate-pulse px-gutter pt-[29px]">
          <div className="h-4 w-24 rounded bg-surface" />
          {[0, 1].map((i) => (
            <div key={i} className="mt-4 flex gap-3">
              <div className="size-[45px] shrink-0 rounded-full bg-surface" />
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <div className="h-4 w-1/3 rounded bg-surface" />
                <div className="h-3.5 w-5/6 rounded bg-surface" />
              </div>
            </div>
          ))}
        </div>
      )}

      {state.status === "error" && (
        <div className="mt-[30px]">
          <CatalogueError title="Couldn’t load notifications." message={state.message} onRetry={retry} />
        </div>
      )}

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
                  {day.items.map((item) => {
                    const n = byId.get(item.id)!;
                    return (
                      <li key={n.id}>
                        <NotificationItem notification={item} unread={isUnread(n)} onOpen={() => open(n)} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        ))}
    </div>
  );
}
