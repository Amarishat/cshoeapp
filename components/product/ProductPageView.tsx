"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { ProductView } from "@/components/product/ProductView";
import { ShareButton } from "@/components/product/ShareButton";
import { loadProductPage } from "@/lib/data/productPages";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

/**
 * Product screen (Figma 1:2478) with its data loaded from Supabase. The
 * header shows the route's names until the product has loaded.
 */
export function ProductPageView({ slug, name, shortName }: { slug: string; name: string; shortName: string }) {
  const { state, retry } = useCatalogueLoad(loadProductPage, slug);
  const product = state.status === "ready" ? state.data.product : null;

  return (
    <>
      <AppHeader
        leading="back"
        title={product?.shortName ?? shortName}
        actions={
          <>
            <ShareButton title={product?.name ?? name} />
            <BagButton />
          </>
        }
      />
      {state.status === "ready" && (
        <ProductView product={state.data.product} customisable={state.data.customisable} />
      )}
      {state.status === "loading" && (
        <div aria-busy="true" aria-label="Loading product" className="mt-8 animate-pulse px-gutter">
          <div className="aspect-[390/395] bg-surface" />
          <div className="mx-auto mt-6 h-[45px] w-[219px] rounded-[11px] bg-surface" />
          <div className="mt-6 h-5 w-2/3 rounded bg-surface" />
          <div className="mt-3 h-4 w-1/3 rounded bg-surface" />
          <div className="mt-3 h-5 w-1/2 rounded bg-surface" />
        </div>
      )}
      {state.status === "error" && (
        <div className="mt-8">
          <CatalogueError message={state.message} onRetry={retry} />
        </div>
      )}
    </>
  );
}
