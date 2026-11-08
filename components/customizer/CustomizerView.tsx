"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { u } from "@/components/home/banner";
import { TryOnButton } from "@/components/product/TryOnButton";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { cn } from "@/lib/cn";
import { designMatches, STALE_DESIGN_MESSAGE } from "@/lib/customizationCheck";
import { createDesign, getDesign, MAX_DESIGN_NAME_LENGTH, updateDesign } from "@/lib/data/userDesigns";
import { formatPrice } from "@/lib/pricing";
import { useBagStore } from "@/lib/store/bag";
import { useCustomizationStore } from "@/lib/store/customization";
import { useBagHydrated } from "@/lib/store/useBagHydrated";
import type { CustomizationConfig, CustomizationSelection, SavedDesign } from "@/lib/types";
import { ColourSwatches } from "./ColourSwatches";
import { PartStepper } from "./PartStepper";
import { ShoeViewer3D } from "./ShoeViewer3D";
import { SizeChipList } from "./SizeChipList";
import { SwipeToAdd } from "./SwipeToAdd";

const EMPTY: CustomizationSelection = {};

/** Shown instead of adding (or saving) a design with no colour chosen: the customiser only adds customised shoes. */
const NO_COLOUR_MESSAGE = "Choose a colour for at least one part to customise this shoe.";

/**
 * Parts the customer can't choose a colour for. The 3D model has no separate
 * heel-counter panel (that area is part of the quarter meshes), so a colour
 * for it would never show. Hidden from the part picker only: designs that
 * already include it stay valid, since every check uses all of config.parts.
 */
const HIDDEN_PART_IDS: ReadonlySet<string> = new Set(["heel-counter"]);

/** A name for a design saved without one, e.g. "Nike Air Force · 7 Nov, 2:05 pm". */
function automaticDesignName(title: string) {
  const when = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
  return `${title} · ${when}`.slice(0, MAX_DESIGN_NAME_LENGTH);
}

/**
 * Customizer body — Figma frame 1:6606 (everything below the header).
 * `cartItemId` (from the Bag's Edit link) switches to editing that Bag item's
 * design: the saved design is loaded, and saving updates that row instead of
 * adding another one. The shared new-design draft is left alone while editing.
 * `designId` (from My Designs, when there's no `cartItemId`) opens that saved
 * design: it's edited apart from the draft, Update Design saves it, and Add to
 * Bag adds a copy of it. Save Design on a new design saves it and then opens it
 * the same way, so saving again updates it instead of saving a duplicate.
 */
export function CustomizerView({
  config,
  cartItemId = null,
  designId = null,
}: {
  config: CustomizationConfig;
  cartItemId?: string | null;
  designId?: string | null;
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

  // A saved design opened from My Designs (never while editing a Bag item).
  // `loaded` is the last design fetched, by id (null design: no such design for
  // this shoe); `designEdit` is its colours as changed here, before saving.
  const designRequested = designId !== null && cartItemId === null;
  const [loaded, setLoaded] = useState<{ id: string; design: SavedDesign | null } | null>(null);
  const [designLoadError, setDesignLoadError] = useState<{ id: string; message: string } | null>(null);
  const [designAttempt, setDesignAttempt] = useState(0);
  const [designEdit, setDesignEdit] = useState<{ id: string; selection: CustomizationSelection } | null>(null);
  // A design just created by Save Design, until the URL catches up with ?design=<its id>
  // (router.replace finishes only once Next has fetched the route). Meanwhile it's the
  // active design and saving stays off, so a second press can't create it again. Cleared
  // as soon as the URL names it (it's then open like any saved design), or by New Design.
  const [createdId, setCreatedId] = useState<string | null>(null);
  if (createdId !== null && designId === createdId) setCreatedId(null);
  const awaitingUrl = createdId !== null && designId === null && cartItemId === null;
  const designLoadedNow = designRequested && loaded?.id === designId;
  const activeDesign = designLoadedNow
    ? loaded.design
    : awaitingUrl && loaded !== null && loaded.id === createdId
      ? loaded.design
      : null;
  const designFailed = designRequested && !designLoadedNow && designLoadError?.id === designId;
  const designPending = designRequested && !designLoadedNow;
  const designMissing = designLoadedNow && activeDesign === null;

  useEffect(() => {
    if (!designRequested || loaded?.id === designId) return;
    let cancelled = false;
    getDesign(designId)
      .then((design) => {
        // A design for another shoe can't be shown in this customiser: treated as not found.
        if (!cancelled) setLoaded({ id: designId, design: design?.productId === config.productId ? design : null });
      })
      .catch((error: unknown) => {
        if (!cancelled) setDesignLoadError({ id: designId, message: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [designRequested, designId, loaded?.id, config.productId, designAttempt]);

  const selection = editing
    ? (editSelection ?? cartItem.customization ?? EMPTY)
    : activeDesign
      ? (designEdit?.id === activeDesign.id ? designEdit.selection : activeDesign.customization)
      : designPending
        ? EMPTY
        : draft;

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
  // Save Design / Update Design. The ref stops a second press before React re-renders.
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "updated" | null>(null);
  const [saveError, setSaveError] = useState("");

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  const selectableParts = config.parts.filter((p) => !HIDDEN_PART_IDS.has(p.id));
  const part = selectableParts[partIndex];
  const partColour = config.colours.find((c) => c.id === selection[part.id]);
  // A saved design (device draft or Bag item) that names a part or colour this
  // customiser no longer has can't be ordered: say so now, don't let it be
  // added or saved, and let the customer start again — never change it for them.
  const stale = !designMatches(selection, {
    partIds: config.parts.map((p) => p.id),
    colourIds: config.colours.map((c) => c.id),
  });

  /** The customer chose to start again: an empty design (nothing is saved until they add or save). */
  function startNewDesign() {
    if (editing) setEditSelection({});
    else if (activeDesign) setDesignEdit({ id: activeDesign.id, selection: {} });
    else clearDraft(config.productId);
    setAddError("");
    setSaveStatus(null);
  }

  function chooseColour(colourId: string) {
    if (editing) setEditSelection({ ...selection, [part.id]: colourId });
    else if (activeDesign) setDesignEdit({ id: activeDesign.id, selection: { ...selection, [part.id]: colourId } });
    else setColour(config.productId, part.id, colourId);
    const colour = config.colours.find((c) => c.id === colourId);
    setAnnouncement(`${part.name} set to ${colour?.name ?? colourId}`);
    // A colour is chosen now, so "choose a colour" no longer applies.
    setAddError((current) => (current === NO_COLOUR_MESSAGE ? "" : current));
    setSaveError((current) => (current === NO_COLOUR_MESSAGE ? "" : current));
    // The design on screen now differs from the one saved.
    setSaveStatus(null);
  }

  /**
   * New Design: leaves the open saved design — still saved, unchanged — for a
   * blank new design (the customiser without ?design=). Nothing is saved,
   * deleted or added to the Bag. The draft is emptied as well: after Save
   * Design it still holds the saved design's colours, which would otherwise
   * come back as the "new" design.
   */
  function startFreshDesign() {
    if (!activeDesign || savingRef.current || adding || awaitingUrl) return;
    clearDraft(config.productId);
    setCreatedId(null);
    setDesignEdit(null);
    setSaveStatus(null);
    setSaveError("");
    setAddError("");
    clearTimeout(addedTimer.current);
    setJustAdded(false);
    setSizeOverride(null);
    setQuantityOverride(null);
    setPartIndex(0);
    setAnnouncement("New design started");
    router.push(`/products/${config.slug}/customise`, { scroll: false });
  }

  /**
   * Save Design (a new design) or Update Design (an opened saved design). The
   * colours on screen are kept either way; a new design is then opened as a
   * saved design (?design=<id>), so saving again updates it.
   */
  async function onSave() {
    if (savingRef.current || designPending || awaitingUrl) return;
    if (stale) return void setSaveError(STALE_DESIGN_MESSAGE);
    if (Object.keys(selection).length === 0) return void setSaveError(NO_COLOUR_MESSAGE);
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    setSaveStatus(null);
    try {
      if (activeDesign) {
        const updated = await updateDesign(activeDesign.id, { customization: { ...selection } });
        setLoaded({ id: updated.id, design: updated });
        setDesignEdit(null);
        setSaveStatus("updated");
      } else {
        const created = await createDesign({
          productId: config.productId,
          customization: { ...selection },
          name: automaticDesignName(config.title),
        });
        setLoaded({ id: created.id, design: created });
        setCreatedId(created.id);
        setSaveStatus("saved");
        router.replace(`/products/${config.slug}/customise?design=${encodeURIComponent(created.id)}`, { scroll: false });
      }
    } catch (error) {
      // Nothing was saved: the design stays on screen for another try.
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function onAdd() {
    if (adding || waitingForItem || designPending) return;
    if (stale) return void setAddError(STALE_DESIGN_MESSAGE);
    // Nothing chosen would add (or save) a plain shoe: ask for a colour instead.
    if (Object.keys(selection).length === 0) return void setAddError(NO_COLOUR_MESSAGE);
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
    // Saved: start the next design fresh (the Bag row keeps this one). An
    // opened saved design isn't the draft, so it stays as it is, and so does the draft.
    if (customised && !activeDesign) clearDraft(config.productId);
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
      <ShoeViewer3D selection={selection} colours={config.colours} wordmark={config.wordmark}>
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
      </ShoeViewer3D>

      <div className="mt-6">
        <PartStepper
          parts={selectableParts}
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

      {/* Save Design / Update Design: not while editing a Bag item (that saves to the Bag). */}
      {!editing && (
        <div className="mt-6 flex flex-col items-center gap-2 px-gutter text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving || designPending || awaitingUrl}
              aria-busy={saving}
              className="h-10 rounded-full border border-border bg-white px-5 text-[15px] font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : activeDesign ? "Update Design" : "Save Design"}
            </button>
            {/* Only with a saved design open: leave it (unchanged) for a blank new design. */}
            {activeDesign && (
              <button
                type="button"
                onClick={startFreshDesign}
                disabled={saving || adding || awaitingUrl}
                className="h-10 rounded-full border border-border bg-white px-5 text-[15px] font-medium disabled:opacity-50"
              >
                New Design
              </button>
            )}
          </div>
          {saveStatus && (
            <p role="status" className="text-secondary">
              {saveStatus === "saved" ? "Design saved." : "Design updated."}{" "}
              <Link href="/designs" className="font-medium underline">
                View My Designs
              </Link>
            </p>
          )}
          {/* The stale-design note below already says why a stale design can't be saved. */}
          {saveError && saveError !== STALE_DESIGN_MESSAGE && (
            <p role="alert" className="text-secondary text-danger [overflow-wrap:anywhere]">
              {saveError}
            </p>
          )}
          {designFailed && (
            <div role="alert" className="text-secondary text-danger [overflow-wrap:anywhere]">
              <p>Couldn’t load your saved design. {designLoadError?.message}</p>
              <button
                type="button"
                onClick={() => {
                  setDesignLoadError(null);
                  setDesignAttempt((n) => n + 1);
                }}
                className="mt-1 font-medium text-ink underline"
              >
                Try again
              </button>
            </div>
          )}
          {designMissing && (
            <p role="alert" className="text-secondary text-ink/70">
              That saved design couldn’t be found, so this is a new design.
            </p>
          )}
        </div>
      )}

      <p aria-live="polite" className="mt-[51px] text-center text-label font-semibold">
        {waitingForItem
          ? "Loading your bag item…"
          : designPending
            ? designFailed
              ? "Your saved design didn’t load"
              : "Loading your design…"
          : editing
            ? adding
              ? "Saving…"
              : "Swipe down to save changes"
            : justAdded
              ? "Added to bag"
              : "Swipe down to add"}
      </p>
      {stale ? (
        <div role="alert" className="mt-2 px-gutter text-center text-secondary text-danger [overflow-wrap:anywhere]">
          <p>{STALE_DESIGN_MESSAGE}</p>
          <button type="button" onClick={startNewDesign} className="mt-1 font-medium text-ink underline">
            Start a new design
          </button>
        </div>
      ) : (
        addError && (
          <p role="alert" className="mt-2 px-gutter text-center text-secondary text-danger [overflow-wrap:anywhere]">
            {addError}
          </p>
        )
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
          disabled={waitingForItem || designPending}
          label={
            editing
              ? `Save changes to ${config.title}, size UK ${sizeUK}, in your bag`
              : `Add ${config.title}, size UK ${sizeUK}, quantity ${quantity}, to bag`
          }
        />

        <div className="mt-[37px] justify-self-end pr-[49px] text-right">
          <p className="text-secondary font-medium text-ink/30">Price</p>
          <p className="mt-[5px] text-[25px] font-medium">{formatPrice(config.price)}</p>
          {/* No discount label: it's display-only and no discount is ever applied (see AdminProductEditor). */}
        </div>
      </div>
    </div>
  );
}
