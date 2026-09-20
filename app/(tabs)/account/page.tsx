import type { Metadata } from "next";
import { AccountView } from "@/components/account/AccountView";
import { AppHeader } from "@/components/layout/AppHeader";

export const metadata: Metadata = { title: "Account" };

/**
 * Account — Figma frame 1:2818 (bottom-nav tab; back always goes Home, as in
 * Figma). The profile is loaded from Supabase by AccountView.
 */
export default function AccountPage() {
  return (
    <>
      <AppHeader leading="back" backHref="/" backAlwaysToHref title="Account" />
      <AccountView />
    </>
  );
}
