"use client";

import Image from "next/image";
import Link from "next/link";
import { CustomisedShoeThumbnail } from "@/components/customizer/CustomisedShoeThumbnail";
import type { CustomizationColour, SavedDesign } from "@/lib/types";

/** One saved design as My Designs shows it: the design plus what's needed to show and open it. */
export interface DesignListing {
  design: SavedDesign;
  /** The shoe's name in the catalogue. */
  productName: string;
  /** The shoe's image, shown until (or instead of) the design's own image. */
  image: { src: string; fit: "cover" | "contain" };
  /** The customiser's colours, to draw the design in; null when the customiser couldn't be read. */
  colours: CustomizationColour[] | null;
  /** /products/<slug>/customise?design=<id>; null when the design can't be opened right now. */
  href: string | null;
  /** Why the design can't be opened or ordered as it is now, or null when it can. */
  problem: string | null;
}

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** "Saved 7 Nov 2026", or "Updated …" once the design has been changed since it was saved. */
function savedLabel(design: SavedDesign) {
  const updated = design.updatedAt !== design.createdAt;
  return `${updated ? "Updated" : "Saved"} ${dateFormat.format(new Date(design.updatedAt))}`;
}

/**
 * A saved design (not in Figma; laid out like a Wishlist row): the design's
 * own image on the left — drawn from the 3D shoe, as in the Bag — and its
 * name, shoe, date and actions on the right.
 */
export function DesignCard({ listing, onDelete }: { listing: DesignListing; onDelete: () => void }) {
  const { design, productName, image, colours, href, problem } = listing;
  const name = design.name ?? "Untitled design";

  return (
    <article aria-label={name} className="flex gap-5 pr-[13px] pl-gutter">
      <div className="relative aspect-[170/120] w-[43%] max-w-[170px] shrink-0 overflow-hidden rounded-[11px] bg-surface">
        {colours ? (
          <CustomisedShoeThumbnail
            productId={design.productId}
            selection={design.customization}
            colours={colours}
            fallback={image}
            alt={`${name}: ${productName} in this design`}
            sizes="170px"
          />
        ) : (
          <Image
            src={image.src}
            alt={productName}
            fill
            sizes="170px"
            className={image.fit === "cover" ? "object-cover" : "object-contain"}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="text-body font-medium [overflow-wrap:anywhere]">{name}</h2>
        <p className="mt-1 text-secondary text-ink/60">{productName}</p>
        <p className="mt-1 text-caption text-ink/50">{savedLabel(design)}</p>
        {problem && <p className="mt-1 text-caption text-danger [overflow-wrap:anywhere]">{problem}</p>}

        <div className="mt-3 flex items-center gap-4">
          {href ? (
            <Link
              href={href}
              aria-label={`Open ${name}`}
              className="flex h-9 items-center rounded-full bg-primary px-4 text-[15px] font-medium text-white"
            >
              Open
            </Link>
          ) : (
            <span aria-disabled="true" className="flex h-9 items-center rounded-full bg-surface px-4 text-[15px] text-ink/40">
              Open
            </span>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${name}`}
            className="text-[15px] font-medium text-danger"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
