import type { Metadata } from "next";
import { NotificationsView } from "@/components/notifications/NotificationsView";

export const metadata: Metadata = { title: "Notifications" };

/** Notifications — Figma frame 1:6944 (bottom-nav tab, no back arrow). */
export default function NotificationsPage() {
  return <NotificationsView />;
}
