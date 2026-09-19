import type { Metadata } from "next";
import { FiltersView } from "@/components/shop/FiltersView";
import { parseAudience } from "@/lib/shopFilters";

export const metadata: Metadata = { title: "Filters" };

/**
 * Sort & Filter — Figma frame 1:5769 (stack screen, opened from Shop's Filter
 * chip). During a Shop search it receives the same `?q=` / `?audience=`.
 * The Shop catalogue is loaded from Supabase by FiltersView.
 */
export default async function FiltersPage({ searchParams }: PageProps<"/shop/filters">) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim() || null;
  return <FiltersView query={query} searchAudience={query ? parseAudience(params.audience) : null} />;
}
