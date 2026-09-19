"use client";

import { CatalogueError } from "@/components/product/CatalogueStatus";
import { SizeChartTable } from "@/components/product/SizeChartTable";
import { loadSizeChartPage } from "@/lib/data/sizeChartPage";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

/** The size chart for one product; the product is loaded from Supabase. */
export function SizeChartView({ slug }: { slug: string }) {
  const { state, retry } = useCatalogueLoad(loadSizeChartPage, slug);

  if (state.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading size chart" className="animate-pulse">
        <div className="flex gap-2 px-gutter">
          <div className="h-8 w-[65px] rounded-[19.5px] bg-surface" />
          <div className="h-8 w-[65px] rounded-[19.5px] bg-surface" />
        </div>
        <div className="mt-6 ml-gutter h-[321px] bg-surface" />
      </div>
    );
  }
  if (state.status === "error") return <CatalogueError message={state.message} onRetry={retry} />;

  return (
    <>
      <h2 className="sr-only">{state.data.productName} sizes</h2>
      <SizeChartTable columns={state.data.columns} />
    </>
  );
}
