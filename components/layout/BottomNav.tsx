"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/Icon";
import { FixedBar } from "./FixedBar";

type NavItem = {
  href: string;
  label: string;
} & ({ icon: IconName; iconClassName: string } | { image: string });

// Order, icons and sizes from Figma "Group 109" (Home 1:1642).
const items: NavItem[] = [
  { href: "/", label: "Home", icon: "home", iconClassName: "size-8" },
  { href: "/notifications", label: "Notifications", icon: "bell", iconClassName: "size-[26px]" },
  { href: "/customise", label: "Customise", image: "/images/icons/customise.png" },
  { href: "/wishlist", label: "Wishlist", icon: "heart", iconClassName: "size-8" },
  { href: "/account", label: "Account", icon: "user", iconClassName: "size-[30px]" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <FixedBar>
      <nav
        aria-label="Main"
        className="flex justify-between bg-surface px-[30px] pt-[9px] pb-[max(env(safe-area-inset-bottom),35px)]"
      >
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className="flex w-11 flex-col items-center"
            >
              <span className="flex h-8 items-center justify-center">
                {"icon" in item ? (
                  <Icon
                    name={item.icon}
                    className={cn(item.iconClassName, !active && "opacity-55")}
                  />
                ) : (
                  <Image
                    src={item.image}
                    alt=""
                    width={26}
                    height={32}
                    className={cn("h-8 w-[26px] object-cover", !active && "opacity-80")}
                  />
                )}
              </span>
              <span
                aria-hidden
                className={cn("mt-[10px] h-[3px] w-9 rounded-[5px]", active && "bg-ink")}
              />
            </Link>
          );
        })}
      </nav>
    </FixedBar>
  );
}
