import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Cshoe Admin" },
  // Never indexed: this is staff tooling, not part of the storefront.
  robots: { index: false, follow: false },
};

/**
 * Admin shell. Deliberately outside the customer layouts, so no guest session
 * is started here and none of the phone-width storefront chrome applies: the
 * admin is a desktop screen on a plain page.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-dvh bg-backdrop text-ink">{children}</div>;
}
