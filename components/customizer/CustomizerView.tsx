"use client";

import { useEffect, useRef, useState } from "react";
import { u } from "@/components/home/banner";
import { TryOnButton } from "@/components/product/TryOnButton";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { formatPrice } from "@/lib/pricing";
import { useBagStore } from "@/lib/store/bag";
import { useCustomizationStore } from "@/lib/store/customization";
import type { CustomizationConfig, CustomizationSelection } from "@/lib/types";
import { ColourSwatches } from "./ColourSwatches";
import { PartStepper } from "./PartStepper";
import { ShoeViewer } from "./ShoeViewer";
import { SizeChipList } from "./SizeChipList";
import { SwipeToAdd } from "./SwipeToAdd";

const EMPTY: CustomizationSelection = {};

/** Customizer body — Figma frame 1:6606 (everything below the header). */
export function CustomizerView({ config }: { config: CustomizationConfig }) {
  const addToBag = useBagStore((s) => s.add);
  const selection = useCustomizationStore((s) => s.drafts[config.productId] ?? EMPTY);
  const setColour = useCustomizationStore((s) => s.setColour);
  const clearDraft = useCustomizationStore((s) => s.clear);

  const [sizeUK, setSizeUK] = useState(config.defaultSizeUK);
  const [quantity, setQuantity] = useState(1);
  const [partIndex, setPartIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [justAdded, setJustAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const addedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  const part = config.parts[partIndex];
  const partColour = config.colours.find((c) => c.id === selection[part.id]);

  function chooseColour(colourId: string) {
    setColour(config.productId, part.id, colourId);
    const colour = config.colours.find((c) => c.id === colourId);
    setAnnouncement(`${part.name} set to ${colour?.name ?? colourId}`);
  }

  async function onAdd() {
    if (adding) return;
    const customised = Object.keys(selection).length > 0;
    setAdding(true);
    setAddError("");
    // Saved to the Bag in Supabase; "Added to bag" only once it has saved.
    const error = await addToBag({
      id: "",
      productId: config.productId,
      size: `UK ${sizeUK}`,
      quantity,
      customization: customised ? { ...selection } : undefined,
    });
    setAdding(false);
    if (error) {
      setAddError(error);
      return;
    }
    // Saved: start the next design fresh (the Bag row keeps this one).
    if (customised) clearDraft(config.productId);
    setJustAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 2000);
  }

  return (
    <div className="pb-[121px]">
      <ShoeViewer angles={config.angles} wordmark={config.wordmark}>
        <p
          id="customizer-size-label"
          className="absolute text-body font-semibold tracking-[0.2475px]"
          style={{ left: u(21), top: u(75) }}
        >
          Size UK
        </p>
        <SizeChipList
          sizes={config.sizesUK}
          value={sizeUK}
          onChange={setSizeUK}
          labelledBy="customizer-size-label"
          className="absolute"
          style={{ left: u(21), top: u(116) }}
        />
        <TryOnButton
          className="absolute -translate-x-1/2"
          style={{ left: "50%", top: u(496) }}
        />
      </ShoeViewer>

      <div className="mt-6">
        <PartStepper
          parts={config.parts}
          index={partIndex}
          onIndexChange={setPartIndex}
          colour={partColour}
        />
      </div>

      <div className="mt-[23px] px-gutter">
        <ColourSwatches
          colours={config.colours}
          value={selection[part.id]}
          onChange={chooseColour}
          partName={part.name}
        />
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <p aria-live="polite" className="mt-[51px] text-center text-label font-semibold">
        {justAdded ? "Added to bag" : "Swipe down to add"}
      </p>
      {addError && (
        <p role="alert" className="mt-2 px-gutter text-center text-secondary text-danger [overflow-wrap:anywhere]">
          {addError}
        </p>
      )}

      <div className="mt-[21px] grid grid-cols-[1fr_auto_1fr] items-start">
        <div className="mt-7 pl-10">
          <p id="customizer-qty-label" className="text-secondary font-medium text-ink/30">
            Qty
          </p>
          <div role="group" aria-labelledby="customizer-qty-label" className="mt-2.5 ml-0.5">
            <QtyStepper variant="circles" value={quantity} onChange={setQuantity} />
          </div>
        </div>

        <SwipeToAdd
          onAdd={() => void onAdd()}
          label={`Add ${config.title}, size UK ${sizeUK}, quantity ${quantity}, to bag`}
        />

        <div className="mt-[37px] justify-self-end pr-[49px] text-right">
          <p className="text-secondary font-medium text-ink/30">Price</p>
          <p className="mt-[5px] text-[25px] font-medium">{formatPrice(config.price)}</p>
          <p className="mt-1 text-[15px] font-medium text-success">{config.discountLabel}</p>
        </div>
      </div>
    </div>
  );
}
