import Link from "next/link";
import type { ReactNode } from "react";

/** Section title (Inter Medium 19) with an optional "View All" link (Medium 16, 70%). */
export function SectionHeader({
  id,
  title,
  viewAllHref,
  aside,
}: {
  id: string;
  title: string;
  viewAllHref?: string;
  /** Optional content on the right instead of "View All" (e.g. a result count). */
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between px-gutter">
      <h2 id={id} className="text-body font-medium">
        {title}
      </h2>
      {viewAllHref && (
        <Link href={viewAllHref} className="text-secondary font-medium text-ink/70">
          View All
        </Link>
      )}
      {!viewAllHref && aside}
    </div>
  );
}
