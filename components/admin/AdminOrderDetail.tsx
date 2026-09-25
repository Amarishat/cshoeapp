"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { SelectField } from "@/components/ui/SelectField";
import { cn } from "@/lib/cn";
import {
  getAdminOrder,
  updateAdminOrderStatus,
  type AdminOrderDetail as Order,
  type AdminOrderLine,
} from "@/lib/data/adminOrders";
import { formatEventDate } from "@/lib/orders";
import { formatAmount, formatPrice } from "@/lib/pricing";
import type { OrderStatus } from "@/lib/types";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

const STATUS_LABEL: Record<OrderStatus, string> = {
  confirmed: "Confirmed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * Every value public.order_status allows: the four delivery steps in the order
 * they happen, then "cancelled" (012), which ends an order off that path.
 */
const STATUS_ORDER: OrderStatus[] = ["confirmed", "shipped", "out_for_delivery", "delivered", "cancelled"];

/** The label shown in the dropdown, back to the value stored in the column. */
const STATUS_BY_LABEL = new Map(STATUS_ORDER.map((status) => [STATUS_LABEL[status], status]));

function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-caption font-medium",
        status === "delivered" ? "bg-success/10 text-success" : "bg-surface text-ink/60",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * The one thing this screen can change. Only the status column is sent, and
 * only an admin's update passes the policy (009); anyone else is told so.
 */
function StatusControl({
  orderNumber,
  status,
  onChange,
}: {
  orderNumber: string;
  status: OrderStatus;
  onChange: (status: OrderStatus) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save(next: OrderStatus) {
    if (saving || next === status) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      onChange(await updateAdminOrderStatus(orderNumber, next));
      setSaved(true);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : String(thrown));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 max-w-[420px]">
      <SelectField
        label="Status"
        className="max-w-[280px]"
        placeholder={STATUS_LABEL[status]}
        options={STATUS_ORDER.map((value) => STATUS_LABEL[value])}
        value={STATUS_LABEL[status]}
        disabled={saving}
        aria-describedby="status-note"
        onChange={(event) => {
          const next = STATUS_BY_LABEL.get(event.target.value);
          if (next) void save(next);
        }}
      />
      <p role="status" className="mt-2 text-secondary text-ink/60">
        {saving ? "Saving…" : saved && !error ? "Status updated" : ""}
      </p>
      {error && (
        <p role="alert" className="mt-1 text-secondary text-danger [overflow-wrap:anywhere]">
          {error}
        </p>
      )}
    </div>
  );
}

const cell = "px-4 py-3 text-left align-middle";
const head = `${cell} text-secondary font-medium text-ink/60`;

function Line({ line }: { line: AdminOrderLine }) {
  return (
    <tr className="border-t border-border align-top">
      <td className={cell}>
        <span className="flex size-[52px] items-center justify-center rounded-[9px] bg-surface">
          <Image src={line.imageUrl} alt="" width={44} height={44} className="size-11 object-contain" />
        </span>
      </td>
      <td className={cell}>
        <span className="block font-medium">{line.name}</span>
        <span className="block text-caption text-ink/50">{line.category}</span>
        {line.isCustomized && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {line.customisations.map((choice) => (
              <li
                key={choice.partName}
                className="flex items-center gap-1.5 rounded-full bg-surface px-2 py-1 text-caption"
              >
                <span
                  aria-hidden
                  className="size-3 rounded-full ring-1 ring-black/15"
                  style={{ backgroundColor: choice.colourHex }}
                />
                {choice.partName} — {choice.colourName}
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className={cn(cell, "tabular-nums")}>UK {line.sizeUK}</td>
      <td className={cn(cell, "text-right tabular-nums")}>{line.quantity}</td>
      <td className={cn(cell, "text-right whitespace-nowrap tabular-nums")}>{formatPrice(line.unitPrice)}</td>
      <td className={cn(cell, "text-right whitespace-nowrap tabular-nums font-medium")}>
        {formatPrice(line.lineTotal)}
      </td>
    </tr>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-6 py-2",
        strong && "border-t border-border pt-3 text-body font-semibold",
      )}
    >
      <span className={strong ? undefined : "text-ink/60"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Order detail — everything fulfilment needs, read-only. The customer's
 * account id and the address row id are never read; the shipping snapshot on
 * the order is what's shown.
 */
export function AdminOrderDetail({ orderNumber }: { orderNumber: string }) {
  const { state, retry } = useCatalogueLoad(getAdminOrder, orderNumber);

  if (state.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading order" className="max-w-[900px] animate-pulse">
        <div className="h-7 w-1/3 rounded bg-surface" />
        <div className="mt-8 h-[140px] rounded-card bg-surface" />
        <div className="mt-8 h-[260px] rounded-card bg-surface" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="max-w-[900px]">
        <CatalogueError title="Couldn’t load the order." message={state.message} onRetry={retry} />
      </div>
    );
  }
  if (!state.data) {
    return (
      <div className="max-w-[900px]">
        <h1 className="text-heading font-semibold">Order not found</h1>
        <p className="mt-2 text-secondary text-ink/60">
          No order “{orderNumber}” is visible to this account.{" "}
          <Link href="/admin/orders" className="underline">
            Back to orders
          </Link>
        </p>
      </div>
    );
  }
  return <Detail order={state.data} />;
}

function Detail({ order }: { order: Order }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);

  return (
    <div className="max-w-[900px]">
      <Link href="/admin/orders" className="text-secondary text-ink/60 underline">
        ← Orders
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-heading font-semibold tabular-nums">{order.orderNumber}</h1>
        <StatusPill status={status} />
      </div>
      <p className="mt-2 text-secondary text-ink/60">Placed {formatEventDate(order.createdAt)}</p>

      <StatusControl orderNumber={order.orderNumber} status={status} onChange={setStatus} />
      <p id="status-note" className="mt-2 max-w-[420px] text-caption text-ink/50">
        Changing this updates only the order’s status — the items, totals and shipping details
        stay exactly as they were placed.
      </p>

      {/* Shipping */}
      <section aria-labelledby="shipping" className="mt-8 rounded-card border border-border bg-page p-6">
        <h2 id="shipping" className="text-body font-semibold">
          Shipping
        </h2>
        <address className="mt-4 text-label not-italic">
          <span className="block font-medium">{order.shipName}</span>
          <span className="block text-ink/70">
            {order.shipStreet}, {order.shipArea}
          </span>
          <span className="block text-ink/70">
            {order.shipCity}, {order.shipState} — {order.shipPincode}
          </span>
          <span className="mt-2 block text-ink/70">Phone: {order.shipPhone}</span>
          <span className="mt-1 block text-caption text-ink/50">Address type: {order.shipType}</span>
        </address>
      </section>

      {/* Items */}
      <section aria-labelledby="items" className="mt-8">
        <h2 id="items" className="text-body font-semibold">
          Items
        </h2>
        <p className="mt-1.5 text-secondary text-ink/60">
          {order.lines.length} {order.lines.length === 1 ? "line" : "lines"} · prices as charged
        </p>

        {order.lines.length === 0 ? (
          <p className="mt-6 rounded-card border border-border bg-page p-8 text-center text-secondary text-ink/60">
            This order has no visible items.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-card border border-border bg-page">
            <table className="w-full border-collapse text-label">
              <caption className="sr-only">Ordered items</caption>
              <thead>
                <tr>
                  <th scope="col" className={head}>
                    <span className="sr-only">Image</span>
                  </th>
                  <th scope="col" className={head}>
                    Product
                  </th>
                  <th scope="col" className={head}>
                    Size
                  </th>
                  <th scope="col" className={cn(head, "text-right")}>
                    Qty
                  </th>
                  <th scope="col" className={cn(head, "text-right")}>
                    Unit price
                  </th>
                  <th scope="col" className={cn(head, "text-right")}>
                    Line total
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <Line key={line.id} line={line} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Totals */}
      <section aria-labelledby="totals" className="mt-8 max-w-[380px]">
        <h2 id="totals" className="sr-only">
          Totals
        </h2>
        <div className="rounded-card border border-border bg-page px-6 py-4 text-label">
          <Total label="Subtotal" value={formatAmount(order.subtotal)} />
          <Total label="Discount" value={formatAmount(order.discount)} />
          <Total label="Delivery" value={formatAmount(order.deliveryFee)} />
          <Total label="Platform fee" value={formatAmount(order.platformFee)} />
          <Total label="Total" value={formatAmount(order.total)} strong />
        </div>
      </section>
    </div>
  );
}
