"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { AvatarPlaceholder } from "@/components/ui/AvatarPlaceholder";
import { Button } from "@/components/ui/Button";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import { getProfile, updateProfile, type UserProfile } from "@/lib/data/userProfile";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

interface QuickLink {
  label: string;
  icon: string;
  iconWidth: number;
  iconHeight: number;
  href?: string;
}

// 2×2 grid from Figma 1:2848–1:2857. Orders and Wishlist work in V1.
const quickLinks: QuickLink[] = [
  { label: "Orders", icon: "/images/account/orders.svg", iconWidth: 25, iconHeight: 25, href: "/orders" },
  { label: "Wishlist", icon: "/images/account/wishlist.svg", iconWidth: 22.5, iconHeight: 20, href: "/wishlist" },
  { label: "Coupons", icon: "/images/account/coupons.svg", iconWidth: 24, iconHeight: 18 },
  { label: "Help Center", icon: "/images/account/help.svg", iconWidth: 22.9, iconHeight: 21.9 },
];

function QuickLinkButton({ link }: { link: QuickLink }) {
  const content: ReactNode = (
    <>
      <Image
        src={link.icon}
        alt=""
        width={Math.ceil(link.iconWidth)}
        height={Math.ceil(link.iconHeight)}
        unoptimized
        style={{ width: link.iconWidth, height: link.iconHeight }}
        className={cn("shrink-0", !link.href && "opacity-40")}
      />
      <span className="truncate">{link.label}</span>
    </>
  );
  const base =
    "relative flex h-11 items-center justify-center gap-2 rounded-[7px] border border-border bg-white px-2 text-[17px] min-[400px]:gap-3 min-[400px]:px-3 font-medium";

  if (link.href) {
    return (
      <Link href={link.href} className={base}>
        {content}
      </Link>
    );
  }
  return (
    <div aria-disabled="true" className={cn(base, "text-ink/40")}>
      {content}
      <ComingSoonBadge className="absolute -top-2.5 right-2" />
    </div>
  );
}

/**
 * Account body — Figma frame 1:2818. The name comes from the guest's
 * Supabase profile, and Edit Profile saves the name and city back to it. The
 * Figma avatar photo, social stats, posts carousel and Grid/Saved tabs are
 * left out; unavailable actions are marked Coming Soon.
 */
export function AccountView() {
  const { state, retry } = useCatalogueLoad(getProfile);
  // The profile as last saved here, so the name updates without reloading.
  const [saved, setSaved] = useState<UserProfile | null>(null);
  const profile = saved ?? (state.status === "ready" ? state.data : null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: "", city: "" });
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // A new guest has no name yet; the screen needs something to show.
  const displayName = profile?.firstName.trim() || "Guest";
  const nameError = attempted && !form.firstName.trim() ? "Enter your first name" : undefined;

  function startEditing() {
    setForm({ firstName: profile?.firstName ?? "", city: profile?.city ?? "" });
    setAttempted(false);
    setSaveError("");
    setEditing(true);
  }

  async function save() {
    if (saving) return;
    setAttempted(true);
    if (!form.firstName.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      setSaved(await updateProfile({ firstName: form.firstName, city: form.city }));
      setEditing(false);
    } catch (error) {
      // Keeps what was typed so it can be saved again.
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-10">
      {/* Figma 1:2823: full-width #CCC line under the header */}
      <hr className="mt-[15px] border-border/70" />

      <section aria-labelledby="account-name" className="flex flex-col items-center px-gutter pt-[15px]">
        {/* Neutral placeholder — no profile photo exists for the user. */}
        <AvatarPlaceholder className="size-[139px] rounded-full" />

        {state.status === "loading" && !profile ? (
          <div aria-busy="true" aria-label="Loading your profile" className="mt-[7px] flex flex-col items-center">
            <div className="h-7 w-32 animate-pulse rounded bg-surface" />
            <div className="mt-6 h-11 w-[170px] animate-pulse rounded-[11px] bg-surface" />
          </div>
        ) : (
          <>
            <h2 id="account-name" className="mt-[7px] text-heading font-semibold">
              {displayName}
            </h2>

            {editing ? (
              <div className="mt-6 flex w-full max-w-[360px] flex-col gap-6">
                <TextField
                  size="sm"
                  label="First Name"
                  placeholder="Enter Your First Name"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  error={nameError}
                />
                <TextField
                  size="sm"
                  label="City"
                  placeholder="Enter Your City"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
                <div className="flex gap-4">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={() => void save()} disabled={saving} aria-busy={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
                {saveError && (
                  <p role="alert" className="text-center text-secondary text-danger [overflow-wrap:anywhere]">
                    {saveError}
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="mt-6 flex h-11 w-[170px] items-center justify-center gap-2.5 rounded-[11px] border border-border text-[17px] font-medium"
              >
                <Image src="/images/account/edit.svg" alt="" width={24} height={24} unoptimized />
                Edit Profile
              </button>
            )}
          </>
        )}

        {state.status === "error" && !profile && (
          <div className="mt-6 w-full">
            <CatalogueError title="Couldn’t load your profile." message={state.message} onRetry={retry} />
          </div>
        )}
      </section>

      {/* Quick links, between the soft-shadow lines from Figma (1:2826 / 1:2827) */}
      <nav
        aria-label="Account shortcuts"
        className="mt-10 border-y-[0.5px] border-[#d9d9d9] py-11 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_-2px_4px_rgba(0,0,0,0.06)]"
      >
        <ul className="grid grid-cols-[repeat(2,minmax(0,170px))] justify-center gap-x-[26px] gap-y-9 px-gutter">
          {quickLinks.map((link) => (
            <li key={link.label}>
              <QuickLinkButton link={link} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
