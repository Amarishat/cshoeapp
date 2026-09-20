import { AudienceTabs } from "@/components/home/AudienceTabs";
import { CustomizeBanner } from "@/components/home/CustomizeBanner";
import {
  HomeBrandsSection,
  HomeCatalogueProvider,
  HomeCustomisationSection,
  HomeNoProducts,
  HomeTopPicksSection,
  HomeTrendingSection,
} from "@/components/home/HomeCatalogue";
import { PromoCarousel } from "@/components/home/PromoCarousel";
import { SearchBar } from "@/components/home/SearchBar";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { SearchResults } from "@/components/shop/SearchResults";
import { parseAudience } from "@/lib/shopFilters";

/*
 * Home — Figma frame 1:1642. Vertical rhythm from Figma: 40px between blocks,
 * 24px between a section title and its content. Brands and products come
 * from Supabase (see HomeCatalogue), as do the greeting and drawer profile
 * (see HomeHeader).
 *
 * `?q=` (from the search bar) shows the search results here, in place of the
 * Home sections; `?audience=` narrows that search to one audience. Clearing
 * the search (or going back) returns to `/` and the normal Home screen.
 */
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim() || null;
  const searchAudience = query ? parseAudience(params.audience) : null;

  return (
    <div className="pb-10">
      <HomeHeader />

      <div className="mt-8 px-gutter">
        <SearchBar action="/" defaultValue={query ?? undefined} />
      </div>

      {query !== null ? (
        <SearchResults query={query} searchAudience={searchAudience} basePath="/" />
      ) : (
        <>
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
            {/* Nothing for this audience (V1: Kids): says so where the products would be. */}
            <HomeNoProducts />

            <div className="mt-10 px-gutter">
              <CustomizeBanner />
            </div>

            <HomeCustomisationSection />
          </HomeCatalogueProvider>
        </>
      )}
    </div>
  );
}
