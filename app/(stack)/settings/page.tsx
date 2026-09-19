import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = { title: "Settings" };

/** Settings — Figma frame 1:6315. Stack screen; the Drawer will link here later. */
export default function SettingsPage() {
  return (
    <>
      <AppHeader leading="back" backHref="/" title="Settings" />
      <SettingsView />
    </>
  );
}
