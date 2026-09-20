import type { Metadata } from "next";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";

export const metadata: Metadata = { title: "Settings" };

interface SettingRow {
  label: string;
  value: string;
  detail: string;
  /** Marks a setting that isn't available yet. */
  comingSoon?: boolean;
}

/*
 * How the admin is wired today. Everything here is read from the code and the
 * migrations, not from a settings table — there is none, and nothing on this
 * page is editable.
 */
const rows: SettingRow[] = [
  {
    label: "Admin authentication",
    value: "Supabase Auth",
    detail:
      "Email and password at /admin/login, using the app’s Supabase client. Customers never sign in; they browse as anonymous guests.",
  },
  {
    label: "Access control",
    value: "Admin role + row level security",
    detail:
      "An account is an admin when its profile row says so; public.is_admin() answers that, and the policies on the catalogue tables use it. The database decides, not the screen — the admin UI guard only saves a pointless round trip.",
  },
  {
    label: "Catalogue data",
    value: "Supabase",
    detail:
      "Products, brands, images, sizes, reviews and the customiser configurations all come from Supabase. The storefront and this admin read the same tables, so a saved change shows up on the shop straight away.",
  },
  {
    label: "Order creation",
    value: "place_order() database function",
    detail:
      "Orders are created only by the place_order() RPC, which prices the bag server-side, writes the order and its lines, and clears the ordered rows — in one transaction.",
  },
  {
    label: "Order status editing",
    value: "Not available yet",
    detail:
      "public.orders is insert-only: there is no update privilege or admin update policy, so order status can’t be changed from here.",
    comingSoon: true,
  },
];

/** Admin settings — a read-only description of the current setup. */
export default function AdminSettingsPage() {
  return (
    <section aria-labelledby="admin-settings" className="max-w-[720px]">
      <h1 id="admin-settings" className="text-heading font-semibold">
        Settings
      </h1>
      <p className="mt-2 text-secondary text-ink/60">
        How this admin is set up. Nothing here is editable — these are facts about the app, not stored
        preferences.
      </p>

      <dl className="mt-8 rounded-card border border-border bg-page">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={index > 0 ? "border-t border-border px-6 py-5" : "px-6 py-5"}
          >
            <dt className="flex flex-wrap items-center gap-2">
              <span className="text-label font-medium">{row.label}</span>
              {row.comingSoon && <ComingSoonBadge />}
            </dt>
            <dd className="mt-1.5">
              <span className="block text-label text-ink/80">{row.value}</span>
              <span className="mt-1 block text-secondary text-ink/60">{row.detail}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
