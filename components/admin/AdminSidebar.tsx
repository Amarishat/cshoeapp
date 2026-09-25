"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

interface NavItem {
  label: string;
  /** Only items with a built screen link; the rest are Coming Soon. */
  href?:
    | "/admin"
    | "/admin/products"
    | "/admin/brands"
    | "/admin/customizer"
    | "/admin/orders"
    | "/admin/settings";
}

/** Only Dashboard is built; the rest are listed so the shape of the admin is clear. */
const items: NavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Brands", href: "/admin/brands" },
  { label: "Customizer", href: "/admin/customizer" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Settings", href: "/admin/settings" },
];

const row = "flex items-center justify-between gap-3 rounded-input px-3 py-2.5 text-label";

/**
 * The admin links and sign-out, shared by the desktop sidebar and the mobile
 * drawer. `onNavigate` runs when a link is chosen (the drawer closes itself).
 */
function AdminNavContent({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    await getAdminSupabaseClient().auth.signOut();
    onNavigate?.();
    router.replace("/admin/login");
  }

  return (
    <>
      <ul className="mt-8 flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <li key={item.label}>
            {item.href ? (
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn(row, pathname === item.href ? "bg-surface font-medium" : "hover:bg-surface")}
              >
                {item.label}
              </Link>
            ) : (
              <span aria-disabled="true" className={cn(row, "text-ink/40")}>
                {item.label}
                <ComingSoonBadge />
              </span>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => void signOut()}
        disabled={signingOut}
        className={cn(row, "w-full justify-start hover:bg-surface disabled:opacity-50")}
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </>
  );
}

/** Admin navigation and sign-out: the desktop column on the left (768px and up). */
export function AdminSidebar() {
  return (
    <nav
      aria-label="Admin"
      className="hidden w-[240px] shrink-0 flex-col border-r border-border bg-page px-4 py-6 md:flex"
    >
      <p className="px-3 text-body font-semibold">Cshoe Admin</p>
      <AdminNavContent />
    </nav>
  );
}

/**
 * Below 768px, where the sidebar is hidden: a top bar with the title and a
 * menu button that opens the same navigation in a drawer. The drawer is a
 * modal <dialog>, so Escape closes it and focus stays inside while it's open;
 * choosing a link or tapping outside closes it too.
 */
export function AdminMobileHeader() {
  const drawer = useRef<HTMLDialogElement>(null);
  const close = () => drawer.current?.close();

  // The drawer is hidden from 768px up; close it then, or the modal would
  // keep the (now sidebar) page inert while invisible.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (desktop.matches) drawer.current?.close();
    };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-page px-4 py-3 md:hidden">
      <p className="text-body font-semibold">Cshoe Admin</p>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        onClick={() => drawer.current?.showModal()}
        className="-mr-2 flex size-10 items-center justify-center rounded-input hover:bg-surface"
      >
        <Icon name="menu" className="size-6" />
      </button>

      <dialog
        ref={drawer}
        aria-label="Admin menu"
        // A tap on the backdrop lands on the <dialog> itself, not its contents.
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-0 h-dvh max-h-none w-[min(280px,85vw)] max-w-none bg-page p-0 text-ink backdrop:bg-black/30 open:flex md:hidden"
      >
        <nav aria-label="Admin" className="flex w-full flex-col px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="px-3 text-body font-semibold">Cshoe Admin</p>
            <button
              type="button"
              aria-label="Close menu"
              onClick={close}
              className="flex size-10 items-center justify-center rounded-input hover:bg-surface"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <AdminNavContent onNavigate={close} />
        </nav>
      </dialog>
    </header>
  );
}
