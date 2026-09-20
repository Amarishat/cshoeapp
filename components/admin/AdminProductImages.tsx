"use client";

import Image from "next/image";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { cn } from "@/lib/cn";
import { listAdminProductImages, type AdminProductImage } from "@/lib/data/adminProducts";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

function ImageRow({ image }: { image: AdminProductImage }) {
  const primary = image.sortOrder === 0;
  return (
    <li className="flex items-center gap-5 border-t border-border p-4 first:border-0">
      <span className="flex size-[72px] shrink-0 items-center justify-center rounded-[9px] bg-surface">
        <Image src={image.src} alt="" width={60} height={60} className="size-15 object-contain" />
      </span>

      <span className="flex w-[104px] shrink-0 flex-col gap-1">
        <span className="text-label tabular-nums">#{image.sortOrder}</span>
        <span
          className={cn(
            "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-caption font-medium",
            primary ? "bg-success/10 text-success" : "bg-surface text-ink/50",
          )}
        >
          {primary ? "Primary" : "Gallery"}
        </span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-label" title={image.src}>
          {image.src}
        </span>
        <span className="truncate text-caption text-ink/50" title={image.alt}>
          {image.kind} · {image.alt || "no alt text"}
        </span>
      </span>
    </li>
  );
}

/**
 * Product images — the rows in public.product_images for this product, in
 * gallery order. Read-only: nothing here uploads, edits or deletes.
 */
export function AdminProductImages({ productId }: { productId: string }) {
  const { state, retry } = useCatalogueLoad(listAdminProductImages, productId);

  return (
    <section aria-labelledby="admin-product-images" className="mt-12 max-w-[720px]">
      <h2 id="admin-product-images" className="text-body font-semibold">
        Product images
      </h2>
      <p className="mt-1.5 text-secondary text-ink/60">
        {state.status === "ready"
          ? `${state.data.length} ${state.data.length === 1 ? "image" : "images"} · sort order 0 is the first slide on the product page`
          : "From public.product_images"}
      </p>

      {state.status === "error" && (
        <div className="mt-6">
          <CatalogueError title="Couldn’t load the images." message={state.message} onRetry={retry} />
        </div>
      )}

      {state.status === "loading" && (
        <ul
          aria-busy="true"
          aria-label="Loading images"
          className="mt-6 animate-pulse rounded-card border border-border bg-page"
        >
          {[0, 1].map((i) => (
            <li key={i} className="flex items-center gap-5 border-t border-border p-4 first:border-0">
              <span className="size-[72px] shrink-0 rounded-[9px] bg-surface" />
              <span className="h-4 w-20 rounded bg-surface" />
              <span className="h-4 flex-1 rounded bg-surface" />
            </li>
          ))}
        </ul>
      )}

      {state.status === "ready" &&
        (state.data.length === 0 ? (
          <p className="mt-6 rounded-card border border-border bg-page p-8 text-center text-secondary text-ink/60">
            This product has no images yet. Its cards still use the product’s card image; a product page
            needs at least one image here.
          </p>
        ) : (
          <ul className="mt-6 rounded-card border border-border bg-page">
            {state.data.map((image) => (
              <ImageRow key={image.id} image={image} />
            ))}
          </ul>
        ))}
    </section>
  );
}
