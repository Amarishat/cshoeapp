"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { getProfile } from "@/lib/data/userProfile";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

/**
 * Home's header (Figma 1:1642): menu button with the side drawer, greeting
 * and bag. The name and city come from the guest's Supabase profile; until it
 * has loaded the greeting shows a placeholder, and a profile that can't be
 * loaded falls back to "Guest" rather than breaking Home.
 */
export function HomeHeader() {
  const { state } = useCatalogueLoad(getProfile);
  const loading = state.status === "loading";
  const profile = state.status === "ready" ? state.data : null;
  const firstName = profile?.firstName.trim() || "Guest";
  const city = profile?.city?.trim() || null;

  return (
    // Figma puts the bag 32px from the right edge on this screen.
    <AppHeader
      leading="menu"
      menuUser={loading ? null : { firstName, city }}
      title={
        loading ? (
          <span className="flex items-center gap-2">
            Hey
            <span aria-hidden className="inline-block h-5 w-20 animate-pulse rounded bg-surface" />
            <span className="sr-only">loading your name</span>👋
          </span>
        ) : (
          `Hey ${firstName} 👋`
        )
      }
      titleClassName="font-medium"
      actions={<BagButton />}
      className="pr-8"
    />
  );
}
