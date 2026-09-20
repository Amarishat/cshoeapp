"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { cn } from "@/lib/cn";
import { getSupabaseClient } from "@/lib/supabase/client";

interface NavItem {
  label: string;
  /** Only items with a built screen link; the rest are Coming Soon. */
  href?: "/admin" | "/admin/products";
}

/** Only Dashboard is built; the rest are listed so the shape of the admin is clear. */
const items: NavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Brands" },
  { label: "Customizer" },
  { label: "Orders" },
  { label: "Settings" },
];

/** Admin navigation and sign-out (desktop column on the left). */
export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    await getSupabaseClient().auth.signOut();
    router.replace("/admin/login");
  }

  const row = "flex items-center justify-between gap-3 rounded-[9px] px-3 py-2.5 text-label";

  return (
    <nav
      aria-label="Admin"
      className="flex w-[240px] shrink-0 flex-col border-r border-border bg-page px-4 py-6"
    >
      <p className="px-3 text-body font-semibold">Cshoe Admin</p>

      <ul className="mt-8 flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <li key={item.label}>
            {item.href ? (
              <Link
                href={item.href}
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
    </nav>
  );
}
