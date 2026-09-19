import type { Metadata } from "next";
import { AccountView } from "@/components/account/AccountView";
import { AppHeader } from "@/components/layout/AppHeader";
import { getCurrentUser } from "@/lib/data/user";

export const metadata: Metadata = { title: "Account" };

/** Account — Figma frame 1:2818 (bottom-nav tab; back always goes Home, as in Figma). */
export default async function AccountPage() {
  const user = await getCurrentUser();

  return (
    <>
      <AppHeader leading="back" backHref="/" backAlwaysToHref title="Account" />
      <AccountView firstName={user.firstName} />
    </>
  );
}
