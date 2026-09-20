import type { Metadata } from "next";
import { BagButton } from "@/components/layout/BagButton";
import { SearchableHeader } from "@/components/layout/SearchableHeader";
import { ShopView } from "@/components/shop/ShopView";
import { parseAudience } from "@/lib/shopFilters";

export const metadata: Metadata = { title: "Shop" };

/**
 * Shop — Figma frame 1:4596 (stack screen; back is normal history back).
 * `?q=` (from Home's search bar) turns it into search results; `?audience=`
 * narrows a search to one audience (a search covers all audiences by default).
 * Products and brands are loaded from Supabase by ShopView.
 */
export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim() || null;
  const searchAudience = query ? parseAudience(params.audience) : null;

  return (
    <>
      <SearchableHeader backHref="/" title="Shop" query={query} actions={<BagButton />} />
      <ShopView query={query} searchAudience={searchAudience} />
    </>
  );
}
