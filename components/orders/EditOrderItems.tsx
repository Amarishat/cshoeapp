"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { SizeSelector } from "@/components/product/SizeSelector";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { cn } from "@/lib/cn";
import { getProductSizes } from "@/lib/data/supabaseCatalog";
import { parseSizeUK } from "@/lib/data/userCart";
import { getOrderByNumber, updateOrderItem } from "@/lib/data/userOrders";
import { formatPrice } from "@/lib/pricing";
import { sizeLabel, type SizeSystem } from "@/lib/sizes";
import type { Order, OrderLine } from "@/lib/types";

/** What public.update_order_item() accepts (and the quantity stepper allows). */
const MAX_QUANTITY = 10;

type SizesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; sizes: Record<string, number[]> };

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The order as the database holds it now; null if it can't be read. */
async function rereadOrder(orderNumber: string): Promise<Order | null> {
  try {
    return await getOrderByNumber(orderNumber);
  } catch {
    return null;
  }
}

/**
 * Changing the size and quantity of a confirmed order's lines (Order Details →
 * Edit Order). One editor per line, each saved on its own through
 * public.update_order_item(), which checks the size and quantity and works the
 * order's totals out again. After a save the order is read again and handed
 * to `onUpdated`, and the editors start again from the fresh lines. When a
 * save is refused, the order is read again too and handed to `onRefused` with
 * the message (the line also keeps showing it), so controls that no longer
 * apply — e.g. once the order has shipped — go away.
 */
export function EditOrderItems({
  order,
  onUpdated,
  onRefused,
}: {
  order: Order;
  onUpdated: (order: Order) => void;
  /** A save was refused: the order as re-read (null if it couldn't be), and why. */
  onRefused: (fresh: Order | null, message: string) => void;
}) {
  const [system, setSystem] = useState<SizeSystem>("uk");
  const [sizes, setSizes] = useState<SizesState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  // The line that was just saved, for its "Item updated" message.
  const [updatedId, setUpdatedId] = useState<string | null>(null);

  // Lines whose product was removed have no product id, and no sizes to load.
  const productKey = [...new Set(order.lines.map((line) => line.productId).filter(Boolean))].join(",");

  useEffect(() => {
    let cancelled = false;
    getProductSizes(productKey ? productKey.split(",") : [])
      .then((result) => {
        if (!cancelled) setSizes({ status: "ready", sizes: result });
      })
      .catch((error: unknown) => {
        if (!cancelled) setSizes({ status: "error", message: messageOf(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [productKey, attempt]);

  function retrySizes() {
    setSizes({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  return (
    <section aria-labelledby="edit-items-heading" className="mt-10 border-b border-[#d9d9d9] pb-10">
      <div className="flex items-center justify-between px-gutter">
        <h2 id="edit-items-heading" className="text-body font-medium">
          Items
        </h2>
        <div role="group" aria-label="Size system" className="flex gap-5 text-body font-medium">
          {(
            [
              ["uk", "UK/India"],
              ["us", "US"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={system === value}
              onClick={() => setSystem(value)}
              className={system === value ? "text-ink" : "text-border"}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 px-gutter text-[15px] text-ink/70">
        Change the size or quantity of an item, then save it. Prices stay as you ordered them.
      </p>

      <ul className="mt-6 divide-y divide-[#d9d9d9]">
        {order.lines.map((line) => (
          <LineEditor
            // A fresh copy of the line (after a save) starts its editor again from the saved values.
            key={`${line.bagItemId}:${line.size}:${line.quantity}`}
            order={order}
            line={line}
            sizes={sizes}
            system={system}
            onRetrySizes={retrySizes}
            justUpdated={updatedId === line.bagItemId}
            onEdit={() => setUpdatedId(null)}
            onSaved={(fresh) => {
              setUpdatedId(line.bagItemId);
              onUpdated(fresh);
            }}
            onRefused={onRefused}
          />
        ))}
      </ul>
    </section>
  );
}

function LineEditor({
  order,
  line,
  sizes,
  system,
  onRetrySizes,
  justUpdated,
  onEdit,
  onSaved,
  onRefused,
}: {
  order: Order;
  line: OrderLine;
  sizes: SizesState;
  system: SizeSystem;
  onRetrySizes: () => void;
  justUpdated: boolean;
  onEdit: () => void;
  onSaved: (fresh: Order) => void;
  onRefused: (fresh: Order | null, message: string) => void;
}) {
  const currentSize = parseSizeUK(line.size);
  const [draftSize, setDraftSize] = useState<number | null>(currentSize);
  const [draftQuantity, setDraftQuantity] = useState(line.quantity);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const productGone = line.productId === "";
  const offered = !productGone && sizes.status === "ready" ? (sizes.sizes[line.productId] ?? []) : [];
  // The current size stays choosable even if the product no longer offers it.
  const options =
    offered.length === 0 || currentSize === null || offered.includes(currentSize)
      ? offered
      : [...offered, currentSize].sort((a, b) => a - b);

  const changed = draftSize !== currentSize || draftQuantity !== line.quantity;
  const overLimit = draftQuantity > MAX_QUANTITY;
  const canSave = changed && !overLimit && draftSize !== null && !saving;
  const labelOf = (uk: number) => `${system === "uk" ? "UK" : "US"} ${sizeLabel(uk, system)}`;

  function edit(update: () => void) {
    update();
    setError("");
    onEdit();
  }

  async function save() {
    if (!canSave || draftSize === null) return;
    setSaving(true);
    setError("");
    try {
      await updateOrderItem(order.id, line.bagItemId, draftSize, draftQuantity);
      const fresh = await getOrderByNumber(order.id);
      if (!fresh) throw new Error("The item was updated, but the order couldn’t be read again. Reload the page.");
      onSaved(fresh);
    } catch (thrown) {
      const message = messageOf(thrown);
      setError(message);
      onRefused(await rereadOrder(order.id), message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="py-6 first:pt-0 last:pb-0">
      <div className="flex items-center gap-4 px-gutter">
        <div
          className="relative h-[60px] w-[95px] shrink-0"
          style={{ filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))" }}
        >
          <Image
            src={line.image.src}
            alt=""
            fill
            sizes="95px"
            className={line.image.fit === "cover" ? "object-cover" : "object-contain"}
          />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-medium">{line.name}</h3>
          {line.customization && <p className="text-[15px] text-ink/50">Customised</p>}
        </div>
      </div>

      {/* Size */}
      <p id={`size-${line.bagItemId}`} className="mt-5 px-gutter text-[15px] text-ink/70">
        Size
      </p>
      {productGone || currentSize === null ? (
        <p className="mt-2 px-gutter text-[17px]">
          {currentSize === null ? line.size : labelOf(currentSize)}
          <span className="mt-1 block text-[15px] text-ink/50">Size can’t be changed</span>
        </p>
      ) : sizes.status === "loading" ? (
        <div aria-hidden className="mt-3 flex gap-[18px] px-gutter">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="size-[55px] shrink-0 animate-pulse rounded-full bg-surface" />
          ))}
        </div>
      ) : sizes.status === "error" ? (
        <div className="mt-2 px-gutter">
          <p className="text-[17px]">{labelOf(currentSize)}</p>
          <p role="alert" className="mt-1 text-[15px] text-ink/60 [overflow-wrap:anywhere]">
            Couldn’t load the other sizes.{" "}
            <button type="button" onClick={onRetrySizes} className="font-medium text-ink underline">
              Retry
            </button>
          </p>
        </div>
      ) : options.length === 0 ? (
        <p className="mt-2 px-gutter text-[17px]">
          {labelOf(currentSize)}
          <span className="mt-1 block text-[15px] text-ink/50">No other sizes are available</span>
        </p>
      ) : (
        <div className="mt-3">
          <SizeSelector
            ariaLabel={`Size of ${line.name} (${system === "uk" ? "UK/India" : "US"})`}
            sizes={options}
            labelFor={(uk) => sizeLabel(uk, system)}
            value={draftSize ?? currentSize}
            onChange={(size) => edit(() => setDraftSize(size))}
          />
        </div>
      )}

      {/* Quantity and the line total at the price paid */}
      <div className="mt-5 flex items-center justify-between gap-4 px-gutter">
        <div className="flex items-center gap-3">
          <span className="text-[15px] text-ink/70">Qty</span>
          <QtyStepper
            value={draftQuantity}
            max={MAX_QUANTITY}
            onChange={(quantity) => edit(() => setDraftQuantity(quantity))}
          />
        </div>
        <p className="text-right">
          <span className="block text-[17px] font-semibold">{formatPrice(line.unitPrice * draftQuantity)}</span>
          {draftQuantity > 1 && (
            <span className="block text-[15px] text-ink/50">
              {formatPrice(line.unitPrice)} × {draftQuantity}
            </span>
          )}
        </p>
      </div>
      {overLimit && (
        <p className="mt-2 px-gutter text-[15px] text-ink/60">
          Quantity must be {MAX_QUANTITY} or less before this item can be saved, including a size change.
        </p>
      )}

      <div className="mt-5 px-gutter">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canSave}
          aria-busy={saving}
          className={cn(
            "h-11 w-full rounded-[7px] text-[15px] font-medium",
            canSave || saving ? "bg-primary text-white" : "bg-surface text-ink/40",
          )}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-[15px] text-danger [overflow-wrap:anywhere]">
            {error}
          </p>
        )}
        <p role="status" className={justUpdated ? "mt-2 text-[15px] font-medium text-success" : "sr-only"}>
          {justUpdated ? "Item updated" : ""}
        </p>
      </div>
    </li>
  );
}
