import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

/** Admin home — a placeholder until the catalogue screens are built. */
export default function AdminDashboardPage() {
  return (
    <section aria-labelledby="admin-dashboard" className="max-w-[720px]">
      <h1 id="admin-dashboard" className="text-heading font-semibold">
        Cshoe Admin
      </h1>
      <p className="mt-2 text-body text-ink/60">Welcome back</p>

      <div className="mt-8 rounded-card border border-border bg-page p-6">
        <h2 className="text-label font-medium">Catalogue management</h2>
        <p className="mt-1.5 text-secondary text-ink/60">
          Products, brands and the customiser are coming next. Nothing here changes the storefront yet.
        </p>
      </div>
    </section>
  );
}
