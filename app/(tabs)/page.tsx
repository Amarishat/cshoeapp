import { AudienceTabs } from "@/components/home/AudienceTabs";
import { CustomizeBanner } from "@/components/home/CustomizeBanner";
import {
  HomeBrandsSection,
  HomeCatalogueProvider,
  HomeCustomisationSection,
  HomeTopPicksSection,
  HomeTrendingSection,
} from "@/components/home/HomeCatalogue";
import { PromoCarousel } from "@/components/home/PromoCarousel";
import { SearchBar } from "@/components/home/SearchBar";
import { HomeHeader } from "@/components/layout/HomeHeader";

/*
 * Home — Figma frame 1:1642. Vertical rhythm from Figma: 40px between blocks,
 * 24px between a section title and its content. Brands and products come
 * from Supabase (see HomeCatalogue), as do the greeting and drawer profile
 * (see HomeHeader).
 */
export default function HomePage() {
  return (
    <div className="pb-10">
      <HomeHeader />

      <div className="mt-8 px-gutter">
        <SearchBar />
      </div>

      <div className="mt-10">
        <AudienceTabs />
      </div>

      <HomeCatalogueProvider>
        <HomeBrandsSection />

        <div className="mt-10 px-gutter">
          <PromoCarousel />
        </div>

        <HomeTopPicksSection />
        <HomeTrendingSection />

        <div className="mt-10 px-gutter">
          <CustomizeBanner />
        </div>

        <HomeCustomisationSection />
      </HomeCatalogueProvider>
    </div>
  );
}
