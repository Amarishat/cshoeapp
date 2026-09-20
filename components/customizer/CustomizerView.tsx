"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { u } from "@/components/home/banner";
import { TryOnButton } from "@/components/product/TryOnButton";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/pricing";
import { useBagStore } from "@/lib/store/bag";
import { useCustomizationStore } from "@/lib/store/customization";
import { useBagHydrated } from "@/lib/store/useBagHydrated";
import type { CustomizationConfig, CustomizationSelection } from "@/lib/types";
import { ColourSwatches } from "./ColourSwatches";
import { PartStepper } from "./PartStepper";
import { ShoeViewer } from "./ShoeViewer";
import { SizeChipList } from "./SizeChipList";
import { SwipeToAdd } from "./SwipeToAdd";

const EMPTY: CustomizationSelection = {};

/**
 * Customizer body — Figma frame 1:6606 (everything below the header).
 * `cartItemId` (from the Bag's Edit link) switches to editing that Bag item's
 * design: the saved design is loaded, and saving updates that row instead of
 * adding another one. The shared new-design draft is left alone while editing.
 */
export function CustomizerView({
  config,
  cartItemId = null,
}: {
  config: CustomizationConfig;
  cartItemId?: string | null;
}) {
  const router = useRouter();
  const addToBag = useBagStore((s) => s.add);
  const setCustomization = useBagStore((s) => s.setCustomization);
  const bagReady = useBagHydrated();
  const cartItem = useBagStore((s) => (cartItemId ? s.items.find((i) => i.id === cartItemId) : undefined));
  const draft = useCustomizationStore((s) => s.drafts[config.productId] ?? EMPTY);
  const setColour = useCustomizationStore((s) => s.setColour);
  const clearDraft = useCustomizationStore((s) => s.clear);

  // The design being edited, kept apart from the shared draft. Null until the
  // Bag item has loaded (or when adding a new item).
  const [editSelection, setEditSelection] = useState<CustomizationSelection | null>(null);
  // Waiting for the Bag tells us whether the row exists; a row that is gone
  // (ordered, removed) falls back to adding a new item.
  const waitingForItem = cartItemId !== null && !bagReady;
  const editing = cartItem !== undefined;
  const selection = editing ? (editSelection ?? cartItem.customization ?? EMPTY) : draft;

  // While editing a Bag item, size and quantity are the item's own and are
  // read-only: V1 saves the design only. When adding, both are editable and
  // start from the customiser's defaults.
  const [sizeOverride, setSizeOverride] = useState<number | null>(null);
  const [quantityOverride, setQuantityOverride] = useState<number | null>(null);
  const itemSizeUK = cartItem ? Number(cartItem.size.replace(/^UK /, "")) : Number.NaN;
  const sizeUK = sizeOverride ?? (Number.isNaN(itemSizeUK) ? config.defaultSizeUK : itemSizeUK);
  const quantity = quantityOverride ?? cartItem?.quantity ?? 1;
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
    if (editing) setEditSelection({ ...selection, [part.id]: colourId });
    else setColour(config.productId, part.id, colourId);
    const colour = config.colours.find((c) => c.id === colourId);
    setAnnouncement(`${part.name} set to ${colour?.name ?? colourId}`);
  }

  async function onAdd() {
    if (adding || waitingForItem) return;
    if (editing) return void saveEdit();
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

  /** Editing: update this Bag item's design, then go back to the Bag. */
  async function saveEdit() {
    if (!cartItem) return;
    setAdding(true);
    setAddError("");
    const error = await setCustomization(cartItem.id, selection);
    setAdding(false);
    if (error) {
      // Nothing was saved: the edited design stays on screen for another try.
      setAddError(error);
      return;
    }
    router.replace("/bag");
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
          // Read-only while editing this Bag item's design.
          onChange={editing ? () => {} : setSizeOverride}
          labelledBy="customizer-size-label"
          className={cn("absolute", editing && "pointer-events-none opacity-50")}
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
        {waitingForItem
          ? "Loading your bag item…"
          : editing
            ? adding
              ? "Saving…"
              : "Swipe down to save changes"
            : justAdded
              ? "Added to bag"
              : "Swipe down to add"}
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
            {/* Read-only while editing: min = max = the item's quantity disables both buttons. */}
            <QtyStepper
              variant="circles"
              value={quantity}
              onChange={setQuantityOverride}
              {...(editing ? { min: quantity, max: quantity } : {})}
            />
          </div>
          {editing && (
            <p className="sr-only">Size and quantity can’t be changed here; only the design is saved.</p>
          )}
        </div>

        <SwipeToAdd
          onAdd={() => void onAdd()}
          disabled={waitingForItem}
          label={
            editing
              ? `Save changes to ${config.title}, size UK ${sizeUK}, in your bag`
              : `Add ${config.title}, size UK ${sizeUK}, quantity ${quantity}, to bag`
          }
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
