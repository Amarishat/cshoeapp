import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { AvatarPlaceholder } from "@/components/ui/AvatarPlaceholder";
import { cn } from "@/lib/cn";

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
 * Account body — Figma frame 1:2818. V1 shows only real data (the user's
 * name). The Figma avatar, social stats, posts carousel and Grid/Saved tabs
 * are left out; unavailable actions are marked Coming Soon.
 */
export function AccountView({ firstName }: { firstName: string }) {
  return (
    <div className="pb-10">
      {/* Figma 1:2823: full-width #CCC line under the header */}
      <hr className="mt-[15px] border-border/70" />

      <section aria-labelledby="account-name" className="flex flex-col items-center px-gutter pt-[15px]">
        {/* Neutral placeholder — no profile photo exists for the user. */}
        <AvatarPlaceholder className="size-[139px] rounded-full" />
        <h2 id="account-name" className="mt-[7px] text-heading font-semibold">
          {firstName}
        </h2>

        <div aria-disabled="true" className="mt-6 flex flex-col items-center gap-2">
          <span className="flex h-11 w-[170px] items-center justify-center gap-2.5 rounded-[11px] border border-border text-[17px] font-medium text-ink/40">
            <Image src="/images/account/edit.svg" alt="" width={24} height={24} unoptimized className="opacity-40" />
            Edit Profile
          </span>
          <ComingSoonBadge />
        </div>
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
