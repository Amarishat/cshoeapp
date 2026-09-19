import { getSupabaseClient } from "@/lib/supabase/client";
import { ensureGuestSession } from "@/lib/supabase/guestSession";

/*
 * The current (anonymous guest) user's notifications in Supabase
 * (public.notifications). They are created by place_order() ("Order
 * confirmed", one per order); the user can only mark them read (read_at).
 * Errors are thrown as-is — never replaced with local data.
 */

export interface UserNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  /** When it was read; null = unread. */
  readAt: string | null;
  /** The related order's number (e.g. "OD10000000001"); null if it has no order. */
  orderNumber: string | null;
}

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
  order: { order_number: string } | null;
}

export class NotificationError extends Error {
  constructor(action: string, cause: { message: string }) {
    super(`Could not ${action}: ${cause.message}`, { cause });
    this.name = "NotificationError";
  }
}

async function currentUserId(): Promise<string> {
  return (await ensureGuestSession()).user.id;
}

/** The user's notifications, newest first, each with its order number. */
export async function listNotifications(): Promise<UserNotification[]> {
  const userId = await currentUserId();
  const { data, error } = await getSupabaseClient()
    .from("notifications")
    .select("id, title, body, created_at, read_at, order:orders(order_number)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id")
    .overrideTypes<NotificationRow[], { merge: false }>();
  if (error) throw new NotificationError("load notifications", error);
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
    orderNumber: row.order?.order_number ?? null,
  }));
}

/** Marks one notification read (sets read_at only; already-read ones keep their time). */
export async function markNotificationRead(id: string): Promise<void> {
  const userId = await currentUserId();
  const { error } = await getSupabaseClient()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id)
    .is("read_at", null);
  if (error) throw new NotificationError("mark the notification as read", error);
}

/** Marks every unread notification of the user read. */
export async function markAllNotificationsRead(): Promise<void> {
  const userId = await currentUserId();
  const { error } = await getSupabaseClient()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw new NotificationError("mark notifications as read", error);
}
