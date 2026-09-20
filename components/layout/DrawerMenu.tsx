"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AvatarPlaceholder } from "@/components/ui/AvatarPlaceholder";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/** Who the drawer greets: the guest's Supabase profile (city optional). */
export interface DrawerUser {
  firstName: string;
  city: string | null;
}

type DrawerIcon =
  | { icon: IconName; iconClassName: string }
  /** Figma icon export in /images/drawer, at its Figma size. */
  | { image: string; width: number; height: number };

type DrawerItem = DrawerIcon & {
  label: string;
  /** Only items with a built screen have an href in V1. */
  href?: string;
};

// Figma 1:1100, top to bottom. Saved uses an outline bookmark instead of the
// Instagram PNG in the Figma file.
const items: DrawerItem[] = [
  { label: "Home", href: "/", icon: "home", iconClassName: "size-[25px]" },
  { label: "Shop", href: "/shop", image: "shop", width: 18.5, height: 18.5 },
  { label: "Orders", href: "/orders", image: "orders", width: 19, height: 19 },
  { label: "Limited Editions", href: "/limited-edition", image: "limited-editions", width: 20, height: 19 },
  { label: "Community", icon: "community", iconClassName: "size-[22px]" },
  { label: "Saved", icon: "bookmark", iconClassName: "size-6" },
  { label: "Rewards", icon: "rewards", iconClassName: "size-6" },
  { label: "Settings", href: "/settings", image: "settings", width: 22, height: 22 },
  { label: "Help", icon: "help", iconClassName: "size-6" },
  { label: "AI Assistant", image: "ai-assistant", width: 24, height: 24 },
];

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ItemRow({ item, onNavigate }: { item: DrawerItem; onNavigate: () => void }) {
  const content = (
    <>
      {/* 26px icon column + 12px gap puts labels at Figma's x58 */}
      <span className="flex w-[26px] shrink-0 justify-center">
        {"icon" in item ? (
          <Icon name={item.icon} className={item.iconClassName} />
        ) : (
          <Image
            src={`/images/drawer/${item.image}.svg`}
            alt=""
            width={Math.ceil(item.width)}
            height={Math.ceil(item.height)}
            unoptimized
            style={{ width: item.width, height: item.height }}
          />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span className="text-body">{item.label}</span>
        {!item.href && <ComingSoonBadge />}
      </span>
    </>
  );
  const base = "flex h-[58px] items-center gap-3 px-5";

  if (item.href) {
    return (
      <Link href={item.href} onClick={onNavigate} className={base}>
        {content}
      </Link>
    );
  }
  return (
    <div aria-disabled="true" className={base}>
      {content}
    </div>
  );
}

/**
 * Home's menu button plus the side drawer it opens — Figma frame 1:1100.
 * A modal dialog pinned to the left of the 430px app column: 312px panel,
 * 25% black backdrop. Closes on backdrop tap, Escape, or a working item.
 */
export function DrawerMenu({ user }: { user: DrawerUser | null }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    panelRef.current?.focus({ preventScroll: true });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      // Keep focus inside the drawer.
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      root.style.overflow = previousOverflow;
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className="-m-[7px] flex p-[7px]"
      >
        <Icon name="menu" className="size-[30px]" />
      </button>

      {/* Stays mounted so it can slide out; hidden + inert while closed. */}
      <div
        inert={!open}
        className={cn(
          "fixed inset-0 z-50 mx-auto w-full max-w-app overflow-hidden",
          // Visible at once on open (so focus can move in); delayed hide on close.
          open ? "visible" : "invisible transition-[visibility] duration-[225ms] motion-reduce:duration-0",
        )}
      >
        <div
          aria-hidden
          onClick={close}
          className={cn(
            "absolute inset-0 bg-black/25 transition-opacity duration-[225ms] ease-out motion-reduce:transition-none",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          tabIndex={-1}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[312px] flex-col overflow-y-auto overscroll-contain bg-white pb-6 shadow-[0_4px_4px_rgba(0,0,0,0.25)] outline-none transition-transform duration-[225ms] ease-out motion-reduce:transition-none",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Profile (not interactive). Figma's 44px status bar is replaced by
              the same safe-area padding the app headers use. */}
          <div className="pt-[calc(max(env(safe-area-inset-top),12px)+35px)]">
            <div className="ml-[30px] h-[85px] w-[86px] rounded-[4px] border-8 border-white bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_0_2px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.1)]">
              <AvatarPlaceholder className="size-full" />
            </div>
            {user ? (
              <>
                <p className="mt-[15px] truncate pr-5 pl-[43px] text-[22px]">{user.firstName}</p>
                {/* Figma's location line; hidden when no city is saved. */}
                {user.city && (
                  <p className="mt-[7px] flex items-center gap-[3px] pr-5 pl-[41px] text-[15px] leading-[18px]">
                    <Icon name="location" className="size-4" />
                    <span className="truncate">{user.city}</span>
                  </p>
                )}
              </>
            ) : (
              <div aria-busy="true" aria-label="Loading your profile" className="animate-pulse">
                <div className="mt-[18px] ml-[43px] h-5 w-28 rounded bg-surface" />
                <div className="mt-[10px] ml-[41px] h-4 w-20 rounded bg-surface" />
              </div>
            )}
          </div>

          {/* Figma 1:1105: #CCC 0.5px line under the profile */}
          <div className="mt-[21px] border-t-[0.5px] border-border/70" />

          <nav aria-label="Main menu" className="pt-4">
            <ul>
              {items.map((item) => (
                <li key={item.label}>
                  <ItemRow item={item} onNavigate={close} />
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
