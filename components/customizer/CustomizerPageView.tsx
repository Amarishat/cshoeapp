"use client";

import { CustomizerView } from "@/components/customizer/CustomizerView";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { ShareButton } from "@/components/product/ShareButton";
import { loadCustomizerPage } from "@/lib/data/customizerPages";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

/**
 * Customizer screen (Figma 1:6606) with its config loaded from Supabase. The
 * header shows the route's name until the config has loaded.
 */
export function CustomizerPageView({
  slug,
  title,
  cartItemId = null,
}: {
  slug: string;
  title: string;
  cartItemId?: string | null;
}) {
  const { state, retry } = useCatalogueLoad(loadCustomizerPage, slug);
  const config = state.status === "ready" ? state.data : null;

  return (
    <>
      {/* Back: history when there is one, otherwise the Customise Hub (Figma 1:6608 → 1:3101). */}
      <AppHeader
        leading="back"
        backHref="/customise"
        title={config?.title ?? title}
        titleClassName="font-medium"
        actions={
          <>
            <ShareButton title={config?.title ?? title} icon="shareOcticon" />
            <BagButton />
          </>
        }
      />
      {/* Figma 1:6686: full-width #CCC line at 70% under the header. */}
      <hr className="mt-[11px] border-border/70" />

      {config && <CustomizerView config={config} cartItemId={cartItemId} />}

      {state.status === "loading" && (
        <div aria-busy="true" aria-label="Loading customiser" className="animate-pulse px-gutter">
          <div className="mt-4 aspect-[430/528] rounded-[20px] bg-surface" />
          <div className="mx-auto mt-6 h-6 w-1/2 rounded bg-surface" />
          <div className="mx-auto mt-[23px] h-9 w-2/3 rounded-full bg-surface" />
        </div>
      )}

      {state.status === "error" && (
        <div className="mt-8">
          <CatalogueError title="Couldn’t load the customiser." message={state.message} onRetry={retry} />
        </div>
      )}
    </>
  );
}
