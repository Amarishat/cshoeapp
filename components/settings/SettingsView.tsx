import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";

interface SettingsRow {
  label: string;
  /** Figma icon export in /images/settings, at its Figma size. */
  icon: string;
  iconWidth: number;
  iconHeight: number;
  /** Only rows with a working screen in V1 have an href. */
  href?: string;
}

interface SettingsSection {
  title?: string;
  rows: SettingsRow[];
}

// Figma 1:6315, top to bottom. Only Saved Addresses works in V1.
const sections: SettingsSection[] = [
  {
    title: "Account Settings",
    rows: [
      { label: "Saved Credit / Debit & Gift Cards", icon: "cards", iconWidth: 27, iconHeight: 30 },
      { label: "Saved Addresses", icon: "addresses", iconWidth: 24, iconHeight: 23, href: "/account/addresses" },
      { label: "Select Language", icon: "language", iconWidth: 24, iconHeight: 24 },
      { label: "Notification Settings", icon: "notifications", iconWidth: 25, iconHeight: 24 },
    ],
  },
  {
    title: "My Activity",
    rows: [
      { label: "Reviews", icon: "reviews", iconWidth: 24, iconHeight: 24 },
      { label: "Questions & Answers", icon: "questions", iconWidth: 25, iconHeight: 25 },
    ],
  },
  {
    title: "Feedback & Information",
    rows: [
      { label: "Terms, Policies and Licenses", icon: "terms", iconWidth: 21, iconHeight: 20 },
      { label: "Browse FAQs", icon: "faqs", iconWidth: 25, iconHeight: 25 },
    ],
  },
  { rows: [{ label: "Logout", icon: "logout", iconWidth: 24, iconHeight: 24 }] },
];

function Row({ row }: { row: SettingsRow }) {
  const content: ReactNode = (
    <>
      {/* 27px icon column + 12px gap puts labels at Figma's x59 */}
      <span className="flex h-[23px] w-[27px] shrink-0 items-center">
        <Image
          src={`/images/settings/${row.icon}.svg`}
          alt=""
          width={row.iconWidth}
          height={row.iconHeight}
          unoptimized
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span className="text-body">{row.label}</span>
        {/* Below the label, so long labels never clip at 360px */}
        {!row.href && <ComingSoonBadge />}
      </span>
      <span className="flex h-[23px] shrink-0 items-center">
        <Image src="/images/settings/chevron-right.svg" alt="" width={9} height={20} unoptimized />
      </span>
    </>
  );
  const base = "flex items-start gap-3 px-gutter";

  if (row.href) {
    return (
      <Link href={row.href} className={`${base} py-2.5`}>
        {content}
      </Link>
    );
  }
  return (
    <div aria-disabled="true" className={`${base} py-1.5`}>
      {content}
    </div>
  );
}

/** Settings body — Figma frame 1:6315 (everything below the header). */
export function SettingsView() {
  return (
    <div className="pb-10">
      {/* Figma 1:6384: full-width #CCC line under the header (as on Account) */}
      <hr className="mt-[15px] border-border/70" />

      {sections.map((section, i) => (
        <section
          key={section.title ?? "logout"}
          aria-label={section.title ? undefined : "Logout"}
          aria-labelledby={section.title ? `settings-section-${i}` : undefined}
          // Figma 1:6316–1:6318: #D9D9D9 70% dividers between sections
          className={i > 0 ? "border-t border-[#d9d9d9]/70" : undefined}
        >
          {section.title && (
            <h2 id={`settings-section-${i}`} className="px-gutter pt-[29px] pb-2.5 text-body font-medium">
              {section.title}
            </h2>
          )}
          <ul className={section.title ? "pb-[15px]" : "pt-[15px] pb-[15px]"}>
            {section.rows.map((row) => (
              <li key={row.label}>
                <Row row={row} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
