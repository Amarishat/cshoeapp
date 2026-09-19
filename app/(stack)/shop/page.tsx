import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { ShopView } from "@/components/shop/ShopView";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { Icon } from "@/components/ui/Icon";
import { getBrands } from "@/lib/data/brands";
import { getProductDetailSlugs } from "@/lib/data/productDetails";
import { getAllProducts } from "@/lib/data/products";
import { parseAudience } from "@/lib/shopFilters";

export const metadata: Metadata = { title: "Shop" };

// Figma's Shop by Brands shows these six, in this order.
const SHOP_BRAND_IDS = ["nike", "adidas", "puma", "asics", "new-balance", "reebok"];

/**
 * Shop — Figma frame 1:4596 (stack screen; back is normal history back).
 * `?q=` (from Home's search bar) turns it into search results; `?audience=`
 * narrows a search to one audience (a search covers all audiences by default).
 */
export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim() || null;
  const searchAudience = query ? parseAudience(params.audience) : null;
  const [products, pageSlugs, allBrands] = await Promise.all([
    getAllProducts(),
    getProductDetailSlugs(),
    getBrands(),
  ]);
  const linkableIds = products.filter((p) => pageSlugs.includes(p.slug)).map((p) => p.id);
  const brands = SHOP_BRAND_IDS.flatMap((id) => allBrands.filter((b) => b.id === id));
  const brandNames = Object.fromEntries(allBrands.map((b) => [b.id, b.name]));

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
      <ShopView
        products={products}
        linkableIds={linkableIds}
        brands={brands}
        brandNames={brandNames}
        query={query}
        searchAudience={searchAudience}
      />
    </>
  );
}
