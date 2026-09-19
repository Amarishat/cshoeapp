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
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { getCurrentUser } from "@/lib/data/user";

/*
 * Home — Figma frame 1:1642. Vertical rhythm from Figma: 40px between blocks,
 * 24px between a section title and its content. Brands and products come
 * from Supabase (see HomeCatalogue); the user is still the mock user.
 */
export default async function HomePage() {
  const user = await getCurrentUser();

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
