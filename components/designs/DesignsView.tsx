"use client";

import { Fragment, useState } from "react";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { CUSTOMISATION_UNAVAILABLE_MESSAGE, designMatches, STALE_DESIGN_MESSAGE } from "@/lib/customizationCheck";
import { CUSTOMIZER_PAGES } from "@/lib/data/customizerPages";
import { CatalogueDataError, getCustomizationConfig, getProducts } from "@/lib/data/supabaseCatalog";
import { deleteDesign, listDesigns } from "@/lib/data/userDesigns";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";
import { DesignCard, type DesignListing } from "./DesignCard";

/**
 * The user's saved designs with what My Designs shows for each: the shoe's
 * name and image from the catalogue, and its customiser's colours (to draw
 * the design and to tell whether it still fits). A design whose customiser
 * is switched off or broken is still listed, and can be deleted, but not opened.
 */
async function loadDesignListings(): Promise<DesignListing[]> {
  const designs = await listDesigns();
  if (designs.length === 0) return [];
  const productIds = [...new Set(designs.map((d) => d.productId))];
  const [products, configs] = await Promise.all([
    getProducts(),
    Promise.all(
      productIds.map((id) =>
        getCustomizationConfig(id).catch((error: unknown) => {
          // A broken customiser setup: shown as "can't be customised right now", not as a page error.
          if (error instanceof CatalogueDataError) return null;
          throw error;
        }),
      ),
    ),
  ]);
  const productById = new Map(products.map((p) => [p.id, p]));
  const configById = new Map(productIds.map((id, i) => [id, configs[i]]));

  return designs.map((design) => {
    const product = productById.get(design.productId);
    const config = configById.get(design.productId) ?? null;
    const page = CUSTOMIZER_PAGES.find((p) => p.productId === design.productId);
    const customizable = !!config?.customizable && !!page;
    const fits =
      !config ||
      designMatches(design.customization, {
        partIds: config.parts.map((p) => p.id),
        colourIds: config.colours.map((c) => c.id),
      });
    const angle = config?.angles[0]?.src;
    return {
      design,
      productName: product?.name ?? config?.title ?? "Shoe",
      // The customiser's own image (as the Bag's fallback), else the product's card image.
      image: angle ? { src: angle, fit: "contain" } : { src: product?.image.src ?? "/images/customizer/bag.svg", fit: "cover" },
      colours: config?.colours ?? null,
      href: customizable ? `/products/${page.slug}/customise?design=${encodeURIComponent(design.id)}` : null,
      problem: !customizable ? CUSTOMISATION_UNAVAILABLE_MESSAGE : fits ? null : STALE_DESIGN_MESSAGE,
    } satisfies DesignListing;
  });
}

/** Pulsing stand-in with the design rows' footprint. */
function RowsPlaceholder() {
  return (
    <div aria-busy="true" aria-label="Loading your designs" className="pb-10">
      <ul aria-hidden className="mt-10 flex animate-pulse flex-col gap-[81px]">
        {["a", "b"].map((key) => (
          <li key={key} className="flex gap-5 pr-[13px] pl-gutter">
            <div className="aspect-[170/120] w-[43%] max-w-[170px] shrink-0 rounded-[11px] bg-surface" />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <div className="h-5 w-3/4 rounded bg-surface" />
              <div className="h-4 w-1/2 rounded bg-surface" />
              <div className="h-4 w-1/3 rounded bg-surface" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * My Designs (not in Figma; laid out like the Wishlist): the user's saved
 * designs from Supabase (public.saved_designs), most recently changed first,
 * each with its own image, Open (back into the customiser) and Delete.
 */
export function DesignsView() {
  const { state, retry } = useCatalogueLoad(loadDesignListings);
  // Deleted here since the list loaded (the list isn't reloaded after a delete).
  const [deletedIds, setDeletedIds] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState<DesignListing | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "status" | "alert"; text: string } | null>(null);

  if (state.status === "loading") return <RowsPlaceholder />;
  if (state.status === "error") {
    return (
      <div className="mt-[30px]">
        <CatalogueError title="Couldn’t load your designs." message={state.message} onRetry={retry} />
      </div>
    );
  }

  const listings = state.data.filter((l) => !deletedIds.has(l.design.id));

  async function confirmDelete() {
    if (!pending || deleting) return;
    const listing = pending;
    setDeleting(true);
    setNotice(null);
    try {
      await deleteDesign(listing.design.id);
      setDeletedIds((ids) => new Set(ids).add(listing.design.id));
      setNotice({ kind: "status", text: "Design deleted." });
    } catch (error) {
      // Nothing was deleted: the design stays in the list.
      setNotice({ kind: "alert", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setDeleting(false);
      setPending(null);
    }
  }

  const noticeLine = notice && (
    <p
      role={notice.kind}
      className={
        notice.kind === "alert"
          ? "mt-4 px-gutter text-[15px] text-danger [overflow-wrap:anywhere]"
          : "mt-4 px-gutter text-[15px] text-ink/60"
      }
    >
      {notice.text}
    </p>
  );

  if (listings.length === 0) {
    return (
      <div>
        {noticeLine}
        <EmptyState icon="bookmark" title="No saved designs yet" actionLabel="Start Designing" actionHref="/customise" />
      </div>
    );
  }

  return (
    <div className="pb-10">
      <p className="mt-[30px] px-gutter text-[17px] text-ink/50">
        {listings.length} {listings.length === 1 ? "design" : "designs"}
      </p>
      {noticeLine}

      <ul aria-label="My Designs" className="mt-8">
        {listings.map((listing, i) => (
          <Fragment key={listing.design.id}>
            {i > 0 && <li aria-hidden className="mx-[30px] my-10 border-t border-border/70" />}
            <li>
              <DesignCard listing={listing} onDelete={() => setPending(listing)} />
            </li>
          </Fragment>
        ))}
      </ul>

      <ConfirmDialog
        open={pending !== null}
        title="Delete this design?"
        message={pending ? `${pending.design.name ?? "This design"} will be deleted. This can’t be undone.` : undefined}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!deleting) setPending(null);
        }}
      />
    </div>
  );
}
