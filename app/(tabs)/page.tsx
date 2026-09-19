import Link from "next/link";
import { AudienceTabs } from "@/components/home/AudienceTabs";
import { BrandRow } from "@/components/home/BrandRow";
import { CustomizeBanner } from "@/components/home/CustomizeBanner";
import { ProductRail } from "@/components/home/ProductRail";
import { PromoCarousel } from "@/components/home/PromoCarousel";
import { SearchBar } from "@/components/home/SearchBar";
import { SectionHeader } from "@/components/home/SectionHeader";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { ProductCard } from "@/components/product/ProductCard";
import { getBrands } from "@/lib/data/brands";
import { getCustomizationSlugs } from "@/lib/data/customizations";
import { getProductDetailSlugs } from "@/lib/data/productDetails";
import { getHomeProducts } from "@/lib/data/products";
import { getCurrentUser } from "@/lib/data/user";

/*
 * Home — Figma frame 1:1642. Vertical rhythm from Figma: 40px between blocks,
 * 24px between a section title and its content.
 */
export default async function HomePage() {
  const [user, brands, { topPicks, trending, trendingCustomisation }, customizerSlugs, pageSlugs] =
    await Promise.all([
      getCurrentUser(),
      getBrands(),
      getHomeProducts(),
      getCustomizationSlugs(),
      getProductDetailSlugs(),
    ]);

  return (
    <div className="pb-10">
      {/* Figma puts the bag 32px from the right edge on this screen. */}
      <AppHeader
        leading="menu"
        menuUser={user}
        title={`Hey ${user.firstName} 👋`}
        titleClassName="font-medium"
        actions={<BagButton />}
        className="pr-8"
      />

      <div className="mt-8 px-gutter">
        <SearchBar />
      </div>

      <div className="mt-10">
        <AudienceTabs />
      </div>

      <section aria-labelledby="home-brands" className="mt-10">
        <SectionHeader id="home-brands" title="Brands" />
        <div className="mt-6">
          <BrandRow brands={brands} />
        </div>
      </section>

      <div className="mt-10 px-gutter">
        <PromoCarousel />
      </div>

      <section aria-labelledby="home-top-picks" className="mt-10">
        <SectionHeader id="home-top-picks" title="Top Picks for You" viewAllHref="/shop" />
        <div className="mt-6">
          <ProductRail label="Top picks for you" gap={13} topInset={14}>
            {topPicks.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                heartOffset="rail"
                // Only products with a built product page link; others are Coming Soon.
                linkable={pageSlugs.includes(product.slug)}
                comingSoon
              />
            ))}
          </ProductRail>
        </div>
      </section>

      <section aria-labelledby="home-trending" className="mt-10">
        <SectionHeader id="home-trending" title="Top Trending Products" />
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 px-gutter">
          {trending.map((product) => (
            <li key={product.id} className="pt-[15px]">
              <ProductCard product={product} linkable={pageSlugs.includes(product.slug)} comingSoon />
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-center">
          <Link
            href="/shop"
            className="flex h-11 w-[110px] items-center justify-center rounded-[33.5px] border border-border bg-white text-label font-medium"
          >
            View All
          </Link>
        </div>
      </section>

      <div className="mt-10 px-gutter">
        <CustomizeBanner />
      </div>

      <section aria-labelledby="home-customisation" className="mt-10">
        <SectionHeader id="home-customisation" title="Top Trending Customisation" />
        <div className="mt-6">
          <ProductRail label="Top trending customisation" gap={15}>
            {trendingCustomisation.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                action="customise"
                categoryOpacity={50}
                // Only products with a built Customizer link; others are Coming Soon.
                linkable={customizerSlugs.includes(product.slug)}
              />
            ))}
          </ProductRail>
        </div>
      </section>
    </div>
  );
}
