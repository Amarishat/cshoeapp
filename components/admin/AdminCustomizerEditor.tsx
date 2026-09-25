"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { adminField, adminToolbarButton } from "@/components/admin/AdminSearchField";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import {
  getAdminCustomizer,
  updateAdminCustomizer,
  type AdminCustomizerColourEdit,
  type AdminCustomizerDetail as Customizer,
  type AdminCustomizerPartEdit,
} from "@/lib/data/adminCustomizer";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";
import { imagePathError } from "@/lib/validation/imagePath";

/*
 * The customiser editor. Configuration fields, then the parts and the colours.
 *
 * What it will not do: change product_id, or the id of a part or colour that
 * already exists — the bag stores those ids, so rewriting one would orphan a
 * customised cart item. A newly added row does get an id, derived from its
 * name and shown so the admin can correct it.
 */

/** Rows are tracked by a local key, because a new row's id starts out empty. */
type PartRow = AdminCustomizerPartEdit & { key: string };
type ColourRow = AdminCustomizerColourEdit & { key: string };

const HEX = /^#[0-9A-Fa-f]{6}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const cell = "px-3 py-2.5 text-left align-top";
const head = `${cell} text-caption font-medium text-ink/50`;

/** A name turned into the id format 001 accepts; empty when nothing usable is left. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function Row({ children }: { children: React.ReactNode }) {
  return <tr className="border-t border-border">{children}</tr>;
}

/** Compact input used inside the parts and colours tables. */
function Cell({
  label,
  value,
  onChange,
  invalid,
  className,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  className?: string;
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "className">) {
  return (
    <input
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={invalid || undefined}
      className={cn(adminField, invalid && "border-danger", className)}
      {...rest}
    />
  );
}

export function AdminCustomizerEditor({ productId }: { productId: string }) {
  const { state, retry } = useCatalogueLoad(getAdminCustomizer, productId);

  if (state.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading customiser" className="max-w-[860px] animate-pulse">
        <div className="h-7 w-1/3 rounded bg-surface" />
        <div className="mt-8 h-[220px] rounded-card bg-surface" />
        <div className="mt-8 h-[320px] rounded-card bg-surface" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="max-w-[860px]">
        <CatalogueError title="Couldn’t load the customiser." message={state.message} onRetry={retry} />
      </div>
    );
  }
  if (!state.data) {
    return (
      <div className="max-w-[860px]">
        <h1 className="text-heading font-semibold">No customiser</h1>
        <p className="mt-2 text-secondary text-ink/60">
          No customiser configuration exists for “{productId}”.{" "}
          <Link href="/admin/customizer" className="underline">
            Back to the list
          </Link>
        </p>
      </div>
    );
  }
  return <EditForm loaded={state.data} />;
}

function EditForm({ loaded }: { loaded: Customizer }) {
  // What the database holds, so a save knows which rows moved.
  const [stored, setStored] = useState(loaded);
  const [title, setTitle] = useState(loaded.title);
  const [displayCategory, setDisplayCategory] = useState(loaded.displayCategory);
  const [wordmark, setWordmark] = useState(loaded.wordmark);
  const [imageUrl, setImageUrl] = useState(loaded.imageUrl);
  const [parts, setParts] = useState<PartRow[]>(
    loaded.parts.map((part) => ({ ...part, isNew: false, key: part.id })),
  );
  const [colours, setColours] = useState<ColourRow[]>(
    loaded.colours.map((colour) => ({ ...colour, isNew: false, key: colour.id })),
  );
  const nextKey = useRef(0);
  const [removedPartIds, setRemovedPartIds] = useState<string[]>([]);
  const [removedColourIds, setRemovedColourIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function touched() {
    setSaved(false);
  }

  function editPart(key: string, patch: Partial<PartRow>) {
    setParts((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    touched();
  }
  function editColour(key: string, patch: Partial<ColourRow>) {
    setColours((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    touched();
  }

  function removePart(row: PartRow) {
    setParts((rows) => rows.filter((other) => other.key !== row.key));
    if (!row.isNew) setRemovedPartIds((ids) => [...ids, row.id]);
    touched();
  }
  function removeColour(row: ColourRow) {
    setColours((rows) => rows.filter((other) => other.key !== row.key));
    if (!row.isNew) setRemovedColourIds((ids) => [...ids, row.id]);
    touched();
  }

  const nextSort = (rows: { sortOrder: number }[]) =>
    rows.reduce((highest, row) => Math.max(highest, row.sortOrder), -1) + 1;

  function addPart() {
    const key = `new-${nextKey.current++}`;
    setParts((rows) => [...rows, { key, id: "", name: "", sortOrder: nextSort(rows), isNew: true }]);
    touched();
  }
  function addColour() {
    const key = `new-${nextKey.current++}`;
    setColours((rows) => [
      ...rows,
      { key, id: "", name: "", hex: "", sortOrder: nextSort(rows), isNew: true },
    ]);
    touched();
  }

  /** A new row's id follows its name until the admin types an id themselves. */
  function nextId(row: { id: string; name: string; isNew: boolean }, name: string) {
    if (!row.isNew) return row.id;
    return row.id === "" || row.id === slugify(row.name) ? slugify(name) : row.id;
  }

  // ---- validation ---------------------------------------------------------
  const problems: string[] = [];
  const blank = (value: string) => value.trim() === "";
  if (blank(title)) problems.push("The title can’t be empty.");
  if (blank(displayCategory)) problems.push("The display category can’t be empty.");
  if (blank(wordmark)) problems.push("The wordmark can’t be empty.");
  // A local image path only: anything else would break next/image on the storefront.
  const imageError = blank(imageUrl) ? "The image URL can’t be empty." : imagePathError(imageUrl.trim());
  if (imageError) problems.push(imageError);
  if (parts.length === 0) problems.push("A customiser needs at least one part.");
  if (colours.length === 0) problems.push("A customiser needs at least one colour.");
  if (parts.some((row) => blank(row.name)) || colours.some((row) => blank(row.name)))
    problems.push("Every part and colour needs a name.");
  if (colours.some((row) => !HEX.test(row.hex)))
    problems.push("Every colour needs a hex value like #1A1A1A.");
  if ([...parts, ...colours].some((row) => !SLUG.test(row.id)))
    problems.push("Every id must be lower-case words joined by hyphens, e.g. “toe-cap”.");
  if (new Set(parts.map((row) => row.id)).size !== parts.length)
    problems.push("Two parts have the same id.");
  if (new Set(colours.map((row) => row.id)).size !== colours.length)
    problems.push("Two colours have the same id.");
  if (new Set(parts.map((row) => row.sortOrder)).size !== parts.length)
    problems.push("Two parts have the same sort order.");
  if (new Set(colours.map((row) => row.sortOrder)).size !== colours.length)
    problems.push("Two colours have the same sort order.");
  if ([...parts, ...colours].some((row) => !Number.isInteger(row.sortOrder) || row.sortOrder < 0))
    problems.push("Sort orders must be whole numbers, 0 or more.");

  const invalid = problems.length > 0;

  async function save() {
    if (saving || invalid) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const fresh = await updateAdminCustomizer(stored.productId, {
        title,
        displayCategory,
        wordmark,
        imageUrl,
        parts,
        colours,
        removedPartIds,
        removedColourIds,
      });
      setStored(fresh);
      setParts(fresh.parts.map((part) => ({ ...part, isNew: false, key: part.id })));
      setColours(fresh.colours.map((colour) => ({ ...colour, isNew: false, key: colour.id })));
      setRemovedPartIds([]);
      setRemovedColourIds([]);
      setTitle(fresh.title);
      setDisplayCategory(fresh.displayCategory);
      setWordmark(fresh.wordmark);
      setImageUrl(fresh.imageUrl);
      setSaved(true);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : String(thrown));
    } finally {
      setSaving(false);
    }
  }

  const detailHref = `/admin/customizer/${stored.productId}` as const;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="max-w-[860px]"
    >
      <Link href={detailHref} className="text-secondary text-ink/60 underline">
        ← {stored.productName}
      </Link>
      <h1 className="mt-3 text-heading font-semibold">Edit customiser</h1>
      <p className="mt-2 text-secondary text-ink/60">
        {stored.productId} · {parts.length} parts · {colours.length} colours
      </p>

      {/* Configuration */}
      <section aria-labelledby="config" className="mt-8 rounded-card border border-border bg-page p-6">
        <h2 id="config" className="text-body font-semibold">
          Configuration
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-5">
          <TextField
            label="Customizer title"
            size="sm"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              touched();
            }}
          />
          <TextField
            label="Display category"
            size="sm"
            value={displayCategory}
            onChange={(event) => {
              setDisplayCategory(event.target.value);
              touched();
            }}
          />
          <TextField
            label="Wordmark"
            size="sm"
            value={wordmark}
            onChange={(event) => {
              setWordmark(event.target.value);
              touched();
            }}
          />
          <TextField
            label="Image URL"
            size="sm"
            placeholder="/images/customizer/red-shoe.png"
            value={imageUrl}
            error={imageError}
            onChange={(event) => {
              setImageUrl(event.target.value);
              touched();
            }}
          />
        </div>
        <p className="mt-5 text-caption text-ink/50">
          The product id and the viewer angles aren’t editable here: the angles are the Figma
          geometry the customiser draws with.
        </p>
      </section>

      {/* Parts */}
      <section aria-labelledby="parts" className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="parts" className="text-body font-semibold">
            Parts
          </h2>
          <button type="button" onClick={addPart} className={adminToolbarButton}>
            Add part
          </button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-card border border-border bg-page">
          <table className="w-full border-collapse text-label">
            <caption className="sr-only">Customisable parts</caption>
            <thead>
              <tr>
                <th scope="col" className={cn(head, "w-[110px]")}>
                  Sort order
                </th>
                <th scope="col" className={head}>
                  Part
                </th>
                <th scope="col" className={cn(head, "w-[200px]")}>
                  Part id
                </th>
                <th scope="col" className={cn(head, "w-[90px] text-right")}>
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => (
                <Row key={part.key}>
                  <td className={cell}>
                    <Cell
                      label={`Sort order for ${part.name || "the new part"}`}
                      inputMode="numeric"
                      className="text-right tabular-nums"
                      value={String(part.sortOrder)}
                      invalid={!Number.isInteger(part.sortOrder) || part.sortOrder < 0}
                      onChange={(value) => editPart(part.key, { sortOrder: Number(value) })}
                    />
                  </td>
                  <td className={cell}>
                    <Cell
                      label="Part name"
                      value={part.name}
                      invalid={part.name.trim() === ""}
                      onChange={(value) =>
                        editPart(part.key, { name: value, id: nextId(part, value) })
                      }
                    />
                  </td>
                  <td className={cell}>
                    {part.isNew ? (
                      <Cell
                        label="Part id"
                        placeholder="toe-cap"
                        value={part.id}
                        invalid={!SLUG.test(part.id)}
                        onChange={(value) => editPart(part.key, { id: value })}
                      />
                    ) : (
                      <span className="block py-2 text-ink/60">{part.id}</span>
                    )}
                  </td>
                  <td className={cn(cell, "text-right")}>
                    <button
                      type="button"
                      onClick={() => removePart(part)}
                      className="rounded-[9px] border border-border px-3 py-1.5 text-secondary font-medium text-danger hover:bg-surface"
                    >
                      Remove
                    </button>
                  </td>
                </Row>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Colours */}
      <section aria-labelledby="colours" className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="colours" className="text-body font-semibold">
            Colours
          </h2>
          <button type="button" onClick={addColour} className={adminToolbarButton}>
            Add colour
          </button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-card border border-border bg-page">
          <table className="w-full border-collapse text-label">
            <caption className="sr-only">Customiser colours</caption>
            <thead>
              <tr>
                <th scope="col" className={cn(head, "w-[110px]")}>
                  Sort order
                </th>
                <th scope="col" className={head}>
                  Colour
                </th>
                <th scope="col" className={cn(head, "w-[150px]")}>
                  Hex
                </th>
                <th scope="col" className={cn(head, "w-[180px]")}>
                  Colour id
                </th>
                <th scope="col" className={cn(head, "w-[90px] text-right")}>
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {colours.map((colour) => (
                <Row key={colour.key}>
                  <td className={cell}>
                    <Cell
                      label={`Sort order for ${colour.name || "the new colour"}`}
                      inputMode="numeric"
                      className="text-right tabular-nums"
                      value={String(colour.sortOrder)}
                      invalid={!Number.isInteger(colour.sortOrder) || colour.sortOrder < 0}
                      onChange={(value) => editColour(colour.key, { sortOrder: Number(value) })}
                    />
                  </td>
                  <td className={cell}>
                    <Cell
                      label="Colour name"
                      value={colour.name}
                      invalid={colour.name.trim() === ""}
                      onChange={(value) =>
                        editColour(colour.key, { name: value, id: nextId(colour, value) })
                      }
                    />
                  </td>
                  <td className={cell}>
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-6 shrink-0 rounded-full ring-1 ring-black/15"
                        style={{ backgroundColor: HEX.test(colour.hex) ? colour.hex : "transparent" }}
                      />
                      <Cell
                        label="Colour hex"
                        placeholder="#1A1A1A"
                        value={colour.hex}
                        invalid={!HEX.test(colour.hex)}
                        onChange={(value) => editColour(colour.key, { hex: value })}
                      />
                    </span>
                  </td>
                  <td className={cell}>
                    {colour.isNew ? (
                      <Cell
                        label="Colour id"
                        placeholder="jet-black"
                        value={colour.id}
                        invalid={!SLUG.test(colour.id)}
                        onChange={(value) => editColour(colour.key, { id: value })}
                      />
                    ) : (
                      <span className="block py-2 text-ink/60">{colour.id}</span>
                    )}
                  </td>
                  <td className={cn(cell, "text-right")}>
                    <button
                      type="button"
                      onClick={() => removeColour(colour)}
                      className="rounded-[9px] border border-border px-3 py-1.5 text-secondary font-medium text-danger hover:bg-surface"
                    >
                      Remove
                    </button>
                  </td>
                </Row>
              ))}
            </tbody>
          </table>
        </div>
        {(removedPartIds.length > 0 || removedColourIds.length > 0) && (
          <p className="mt-4 text-caption text-ink/50">
            Removing a part or colour is saved when you save. Past orders keep their own copy of
            the names, but a customer who already has this shoe customised in their bag with a
            removed option won’t be able to check out until they change it.
          </p>
        )}
      </section>

      {/* Save */}
      {invalid && (
        <ul className="mt-8 flex list-disc flex-col gap-1 pl-5 text-secondary text-ink/60">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-6 text-secondary text-danger [overflow-wrap:anywhere]">
          {error}
        </p>
      )}
      <p role="status" className="mt-6 text-secondary text-success">
        {saving ? "" : saved && !error ? "Saved" : ""}
      </p>

      <div className="mt-2 flex items-center gap-4">
        <Button type="submit" size="md" disabled={saving || invalid}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Link href={detailHref} className="text-label text-ink/60 underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
