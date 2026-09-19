"use client";

import { useEffect, useRef, useState } from "react";
import { ShoeViewer } from "@/components/customizer/ShoeViewer";
import { SizeChipList } from "@/components/customizer/SizeChipList";
import { SwipeToAdd } from "@/components/customizer/SwipeToAdd";
import { u } from "@/components/home/banner";
import { HeartButton } from "@/components/product/HeartButton";
import { cn } from "@/lib/cn";
import type { LimitedEdition } from "@/lib/data/limitedEdition";
import { formatPrice } from "@/lib/pricing";
import { useBagStore } from "@/lib/store/bag";

/**
 * Limited Edition body — Figma frame 1:2893 (below the header). Everything
 * above the swipe prompt is laid out in the ShoeViewer's Figma coordinates
 * (`u()`), like the Customizer. No size is preselected; the swipe stays
 * disabled until one is chosen. Figma's shoebox drop target is not used.
 */
export function LimitedEditionView({ edition }: { edition: LimitedEdition }) {
  const addToBag = useBagStore((s) => s.add);
  const [sizeUK, setSizeUK] = useState<number | null>(null);
  const [colourId, setColourId] = useState(edition.colourways[0]?.id);
  const [justAdded, setJustAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const addedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  async function onAdd() {
    if (sizeUK === null || adding) return;
    setAdding(true);
    setAddError("");
    // Plain (not customised) item: same product + size adds quantity. Saved to
    // the Bag in Supabase; "Added to bag" only once it has saved.
    const error = await addToBag({ id: "", productId: edition.productId, size: `UK ${sizeUK}`, quantity: 1 });
    setAdding(false);
    if (error) {
      setAddError(error);
      return;
    }
    setJustAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 2000);
  }

  const status = justAdded
    ? "Added to bag"
    : sizeUK === null
      ? "Select a size to add to Cart"
      : "Swipe down to add to Cart";

  return (
    <div className="pb-10">
      <ShoeViewer
        angles={[edition.hero]}
        wordmark={edition.wordmark}
        wordmarkPlacement={edition.wordmarkPlacement}
        show360={false}
      >
        <p
          id="limited-size-label"
          className="absolute text-body font-semibold tracking-[0.2475px]"
          style={{ left: u(22), top: u(75) }}
        >
          Size
        </p>
        <SizeChipList
          sizes={edition.sizesUK}
          value={sizeUK}
          onChange={setSizeUK}
          labelledBy="limited-size-label"
          className="absolute"
          style={{ left: u(20), top: u(115) }}
        />

        <p
          id="limited-colour-label"
          className="absolute text-label font-semibold"
          style={{ right: u(22), top: u(262) }}
        >
          Colour
        </p>
        {/* Figma 1:2914: 32px white square, radius 12, colour chip inside. */}
        <div
          role="radiogroup"
          aria-labelledby="limited-colour-label"
          className="absolute flex flex-col gap-[17px]"
          style={{ left: u(364), top: u(299) }}
        >
          {edition.colourways.map((colour) => {
            const selected = colour.id === colourId;
            return (
              <button
                key={colour.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={colour.name}
                onClick={() => setColourId(colour.id)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-xl border bg-white",
                  selected ? "border-ink" : "border-[#e0e0e1]",
                )}
              >
                <span className="size-3.5 rounded-[2px]" style={{ backgroundColor: colour.hex }} />
              </button>
            );
          })}
        </div>
        {/* Figma heart centre (380.75, 417.3); the image variant's white disc is invisible on white. */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: u(380.75), top: u(417.3) }}>
          <HeartButton productId={edition.productId} productName={edition.name} variant="image" className="block" />
        </div>

        {/* Price block and name scale with the viewer (like the wordmark) so
            they keep Figma's spacing at narrow widths. */}
        <p className="absolute font-medium" style={{ left: u(26), top: u(438), fontSize: u(27) }}>
          {formatPrice(edition.price)}
        </p>
        <p
          className="absolute font-medium text-[#be3032]"
          style={{ left: u(42), top: u(472), fontSize: u(15) }}
        >
          {edition.discountLabel}
        </p>
        <h2
          className="absolute -translate-x-1/2 font-semibold tracking-[0.2475px] whitespace-nowrap"
          style={{ left: u(217), top: u(495), fontSize: u(25) }}
        >
          {edition.name}
        </h2>
      </ShoeViewer>

      <p aria-live="polite" className="mt-[26px] text-center text-label font-semibold">
        {status}
      </p>
      {addError && (
        <p role="alert" className="mt-2 px-gutter text-center text-secondary text-danger [overflow-wrap:anywhere]">
          {addError}
        </p>
      )}
      <div className="mt-[25px] flex justify-center">
        <SwipeToAdd
          onAdd={() => void onAdd()}
          disabled={sizeUK === null}
          label={
            sizeUK === null
              ? `Add ${edition.name} to bag — select a size first`
              : `Add ${edition.name}, size UK ${sizeUK}, to bag`
          }
        />
      </div>
    </div>
  );
}
