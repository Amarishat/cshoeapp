import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { ShopView } from "@/components/shop/ShopView";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { Icon } from "@/components/ui/Icon";
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
      <AppHeader
        leading="back"
        backHref="/"
        title="Shop"
        actions={
          <>
            <span className="flex items-center gap-2">
              <ComingSoonBadge />
              <span role="img" aria-label="Search (coming soon)" className="flex">
                <Icon name="search" className="size-[30px] text-ink/40" />
              </span>
            </span>
            <BagButton />
          </>
        }
      />
      <ShopView query={query} searchAudience={searchAudience} />
    </>
  );
}
