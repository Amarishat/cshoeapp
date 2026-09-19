import type { Metadata } from "next";
import { CustomiseHubView } from "@/components/customise/CustomiseHubView";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { Icon } from "@/components/ui/Icon";
import { getBrands } from "@/lib/data/brands";
import { getCustomizationSlugs } from "@/lib/data/customizations";
import { getAllProducts } from "@/lib/data/products";

export const metadata: Metadata = { title: "Customise" };

// Figma's brand circles, in order.
const HUB_BRAND_IDS = ["nike", "adidas", "puma", "reebok", "new-balance"];

/** Customise Hub — Figma frame 1:3101 (bottom-nav tab, no back arrow). */
export default async function CustomiseHubPage() {
  const [products, customizerSlugs, allBrands] = await Promise.all([
    getAllProducts(),
    getCustomizationSlugs(),
    getBrands(),
  ]);
  // Only products with a built Customizer (V1: Nike Air Force).
  const customisable = products.filter((p) => customizerSlugs.includes(p.slug));
  const brands = HUB_BRAND_IDS.flatMap((id) => allBrands.filter((b) => b.id === id));

  return (
    <>
      <AppHeader
        title="Customise"
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
      <CustomiseHubView products={customisable} brands={brands} />
    </>
  );
}
