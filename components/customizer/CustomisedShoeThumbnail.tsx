"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { CustomizationColour, CustomizationSelection } from "@/lib/types";
import { partHexes } from "./partHexes";
import { cachedShoeThumbnail, thumbnailKey } from "./thumbnailCache";

/** Loaded in the browser only, and only when a thumbnail has to be made (WebGL, the 3D model). */
const ShoeThumbnailRenderer = dynamic(() => import("./ShoeThumbnailRenderer").then((m) => m.ShoeThumbnailRenderer), {
  ssr: false,
});

/**
 * A customised shoe's image, in its own colours: a still of the customiser's
 * 3D shoe, side on like the product cut-outs. Shows `fallback` (the product's
 * own image) until the still is ready, and keeps showing it if the still can't
 * be made (no WebGL, the model can't load) or the design has no colour this
 * customiser knows. Fills its parent, as next/image's `fill`.
 *
 * Only for products whose customiser shows the 3D shoe (SHOE_MODEL_URL). Each
 * design is drawn once per visit and shared by every place showing it.
 */
export function CustomisedShoeThumbnail({
  productId,
  selection,
  colours,
  fallback,
  alt,
  sizes,
}: {
  productId: string;
  /** The saved design: part id → colour id. */
  selection: CustomizationSelection;
  /** The customiser's colours, to look the design's colour ids up in. */
  colours: readonly CustomizationColour[];
  fallback: { src: string; fit: "cover" | "contain" };
  alt: string;
  sizes: string;
}) {
  const hexByPart = useMemo(() => partHexes(selection, colours), [selection, colours]);
  // No colour this customiser knows: nothing to draw, so the product's own image.
  const key = Object.keys(hexByPart).length > 0 ? thumbnailKey(productId, hexByPart) : null;

  // The still for `key` once made here, and the design that couldn't be drawn.
  const [made, setMade] = useState<{ key: string; url: string } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const url = (made?.key === key ? made.url : undefined) ?? (key ? cachedShoeThumbnail(key) : undefined);
  const needsRender = key !== null && !url && failedKey !== key;

  function onReady(madeUrl: string) {
    if (key) setMade({ key, url: madeUrl });
  }
  function onError() {
    setFailedKey(key);
  }

  return (
    <>
      <Image
        src={url ?? fallback.src}
        alt={alt}
        fill
        sizes={sizes}
        // A generated still is already the right size; next/image can't optimise a data URL.
        unoptimized={!!url}
        className={cn(url || fallback.fit === "contain" ? "object-contain" : "object-cover")}
      />
      {needsRender && (
        // Keyed by design, so an edited design starts afresh (including after a failure).
        <ShoeThumbnailRenderer key={key} thumbnailKey={key} hexByPart={hexByPart} onReady={onReady} onError={onError} />
      )}
    </>
  );
}
