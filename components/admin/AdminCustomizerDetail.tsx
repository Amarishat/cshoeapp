"use client";

import Image from "next/image";
import Link from "next/link";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { cn } from "@/lib/cn";
import {
  getAdminCustomizer,
  type AdminCustomizerColour,
  type AdminCustomizerDetail as Customizer,
} from "@/lib/data/adminCustomizer";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

const cell = "px-4 py-3 text-left align-middle";
const head = `${cell} text-secondary font-medium text-ink/60`;

/** One read-only field of the configuration. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption text-ink/50">{label}</dt>
      <dd className="text-label [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

function Swatches({ colours }: { colours: AdminCustomizerColour[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {colours.map((colour) => (
        <li
          key={colour.id}
          className="flex items-center gap-1.5 rounded-full bg-surface px-2 py-1 text-caption"
        >
          <span
            aria-hidden
            className="size-3 rounded-full ring-1 ring-black/15"
            style={{ backgroundColor: colour.hex }}
          />
          {colour.name}
        </li>
      ))}
    </ul>
  );
}

/**
 * Customiser detail — the configuration, its parts in sort order, and the
 * colours. Colours live on the product, not on a part
 * (public.customization_colours has no part column), so every part offers the
 * same set; that is what the customiser screen does. Read-only throughout.
 */
export function AdminCustomizerDetail({ productId }: { productId: string }) {
  const { state, retry } = useCatalogueLoad(getAdminCustomizer, productId);

  if (state.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading customiser" className="max-w-[860px] animate-pulse">
        <div className="h-7 w-1/3 rounded bg-surface" />
        <div className="mt-8 h-[180px] rounded-card bg-surface" />
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
  return <Detail customizer={state.data} />;
}

function Detail({ customizer }: { customizer: Customizer }) {
  const { angles, parts, colours } = customizer;

  return (
    <div className="max-w-[860px]">
      <Link href="/admin/customizer" className="text-secondary text-ink/60 underline">
        ← Customizer
      </Link>
      <h1 className="mt-3 text-heading font-semibold">{customizer.productName}</h1>
      <p className="mt-2 text-secondary text-ink/60">
        {customizer.productSlug} · {parts.length} parts · {colours.length} colours
      </p>

      {/* Configuration */}
      <section aria-labelledby="config" className="mt-8 rounded-card border border-border bg-page p-6">
        <h2 id="config" className="text-body font-semibold">
          Configuration
        </h2>
        <div className="mt-5 flex gap-6">
          <span className="flex size-[104px] shrink-0 items-center justify-center rounded-[9px] bg-surface">
            <Image
              src={customizer.imageUrl}
              alt=""
              width={88}
              height={88}
              className="max-h-22 w-22 object-contain"
            />
          </span>
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Product name" value={customizer.productName} />
            <Field label="Customizer title" value={customizer.title} />
            <Field label="Display category" value={customizer.displayCategory} />
            <Field label="Wordmark" value={customizer.wordmark} />
            <div className="col-span-2">
              <Field label="Image URL" value={customizer.imageUrl} />
            </div>
          </dl>
        </div>
      </section>

      {/* Angles */}
      <section aria-labelledby="angles" className="mt-8 rounded-card border border-border bg-page p-6">
        <h2 id="angles" className="text-body font-semibold">
          Angles
        </h2>
        <p className="mt-1.5 text-secondary text-ink/60">
          {angles.length} {angles.length === 1 ? "angle" : "angles"} · the viewer swipes between them when
          there is more than one
        </p>
        {angles.length === 0 ? (
          <p className="mt-5 text-secondary text-ink/60">This configuration has no angles.</p>
        ) : (
          <ul className="mt-5 flex flex-col gap-4">
            {angles.map((angle, index) => (
              <li key={angle.src + index} className="flex items-center gap-5">
                <span className="flex size-[72px] shrink-0 items-center justify-center rounded-[9px] bg-surface">
                  <Image
                    src={angle.src}
                    alt=""
                    width={60}
                    height={60}
                    className="size-15 object-contain"
                  />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-label" title={angle.src}>
                    {angle.src}
                  </span>
                  <span className="truncate text-caption text-ink/50" title={angle.alt}>
                    {angle.alt}
                  </span>
                  <span className="text-caption text-ink/50 tabular-nums">
                    frame [{angle.frame.join(", ")}] · size [{angle.size.join(", ")}] · rotate{" "}
                    {angle.rotate}°{angle.shadow ? ` · shadow [${angle.shadow.join(", ")}]` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Parts */}
      <section aria-labelledby="parts" className="mt-8">
        <h2 id="parts" className="text-body font-semibold">
          Parts
        </h2>
        <p className="mt-1.5 text-secondary text-ink/60">
          In the order the customiser steps through them. Colours are stored per product, so every part
          offers the same {colours.length} {colours.length === 1 ? "colour" : "colours"}.
        </p>

        {parts.length === 0 ? (
          <p className="mt-6 rounded-card border border-border bg-page p-8 text-center text-secondary text-ink/60">
            This customiser has no parts yet.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-card border border-border bg-page">
            <table className="w-full border-collapse text-label">
              <caption className="sr-only">Customisable parts</caption>
              <thead>
                <tr>
                  <th scope="col" className={cn(head, "w-[110px] text-right")}>
                    Sort order
                  </th>
                  <th scope="col" className={head}>
                    Part
                  </th>
                  <th scope="col" className={head}>
                    Part id
                  </th>
                  <th scope="col" className={head}>
                    Available colours
                  </th>
                </tr>
              </thead>
              <tbody>
                {parts.map((part) => (
                  <tr key={part.id} className="border-t border-border">
                    <td className={cn(cell, "text-right tabular-nums text-ink/60")}>#{part.sortOrder}</td>
                    <td className={cn(cell, "font-medium")}>{part.name}</td>
                    <td className={cn(cell, "text-ink/60")}>{part.id}</td>
                    <td className={cell}>
                      {colours.length === 0 ? (
                        <span className="text-ink/40">No colours configured</span>
                      ) : (
                        <Swatches colours={colours} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
