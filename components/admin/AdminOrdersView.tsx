"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  adminToolbarButton,
  AdminSearchField,
  AdminSelectField,
  matchesTerms,
} from "@/components/admin/AdminSearchField";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { cn } from "@/lib/cn";
import { loadAdminOrders } from "@/lib/data/adminOrders";
import { formatEventDate } from "@/lib/orders";
import { formatPrice } from "@/lib/pricing";
import type { OrderStatus } from "@/lib/types";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

const cell = "px-4 py-3 text-left align-middle";
const head = `${cell} text-secondary font-medium text-ink/60`;

/** Every value of public.order_status: the delivery steps in order, then "cancelled". */
const STATUS_LABEL: Record<OrderStatus, string> = {
  confirmed: "Confirmed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** "All", then every real status. Nothing here can change an order's status. */
const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];

/**
 * Orders — read-only list of public.orders, newest first. Nothing here
 * creates, edits or cancels an order; orders are written only by
 * place_order().
 */
export function AdminOrdersView() {
  const { state, retry } = useCatalogueLoad(loadAdminOrders);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const orders = state.status === "ready" ? state.data : null;
  const active = search.trim() !== "" || status !== "all";
  const shown = useMemo(
    () =>
      orders === null
        ? []
        : orders.filter(
            (order) =>
              matchesTerms(`${order.orderNumber} ${order.shipName}`, search) &&
              (status === "all" || order.status === status),
          ),
    [orders, search, status],
  );

  function clear() {
    setSearch("");
    setStatus("all");
  }

  return (
    <section aria-labelledby="admin-orders" className="max-w-[900px]">
      <h1 id="admin-orders" className="text-heading font-semibold">
        Orders
      </h1>
      <p className="mt-2 text-secondary text-ink/60">
        {orders === null
          ? "From public.orders"
          : active
            ? `Showing ${shown.length} of ${orders.length} ${orders.length === 1 ? "order" : "orders"}`
            : `${orders.length} ${orders.length === 1 ? "order" : "orders"} · newest first`}
      </p>

      {orders !== null && orders.length > 0 && (
        <search className="mt-8 rounded-card border border-border bg-page p-4">
          <div className="flex flex-wrap items-end gap-4">
            <AdminSearchField
              className="min-w-[260px] flex-1"
              placeholder="Order number or ship-to name"
              value={search}
              onChange={setSearch}
            />
            <AdminSelectField
              label="Status"
              className="w-[170px]"
              value={status}
              onChange={setStatus}
              options={[...STATUS_OPTIONS]}
            />
            {active && (
              <button type="button" onClick={clear} className={adminToolbarButton}>
                Clear
              </button>
            )}
          </div>
        </search>
      )}

      {state.status === "error" && (
        <div className="mt-8">
          <CatalogueError title="Couldn’t load the orders." message={state.message} onRetry={retry} />
        </div>
      )}

      {state.status === "loading" && (
        <div
          aria-busy="true"
          aria-label="Loading orders"
          className="mt-8 animate-pulse rounded-card border border-border bg-page p-4"
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-6 border-b border-border py-3 last:border-0">
              <span className="h-4 w-40 rounded bg-surface" />
              <span className="h-4 w-28 rounded bg-surface" />
              <span className="h-4 w-20 rounded bg-surface" />
              <span className="h-4 w-24 rounded bg-surface" />
            </div>
          ))}
        </div>
      )}

      {orders !== null &&
        (orders.length === 0 ? (
          <p className="mt-8 rounded-card border border-border bg-page p-10 text-center text-body text-ink/60">
            No orders are visible to this account.
          </p>
        ) : shown.length === 0 ? (
          <div className="mt-8 rounded-card border border-border bg-page p-10 text-center">
            <p className="text-body text-ink/60">No orders match this search.</p>
            <button
              type="button"
              onClick={clear}
              className="mt-5 rounded-[9px] border border-border px-3 py-1.5 text-secondary font-medium hover:bg-surface"
            >
              Clear search and filters
            </button>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-card border border-border bg-page">
            <table className="w-full border-collapse text-label">
              <caption className="sr-only">Orders</caption>
              <thead>
                <tr>
                  <th scope="col" className={head}>
                    Order ID
                  </th>
                  <th scope="col" className={head}>
                    Placed
                  </th>
                  <th scope="col" className={head}>
                    Ship to
                  </th>
                  <th scope="col" className={cn(head, "text-right")}>
                    Items
                  </th>
                  <th scope="col" className={cn(head, "text-right")}>
                    Total
                  </th>
                  <th scope="col" className={head}>
                    Status
                  </th>
                  <th scope="col" className={head}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((order) => (
                  <tr key={order.orderNumber} className="border-t border-border">
                    <td className={cn(cell, "font-medium tabular-nums")}>{order.orderNumber}</td>
                    <td className={cn(cell, "whitespace-nowrap")}>{formatEventDate(order.createdAt)}</td>
                    <td className={cell}>{order.shipName}</td>
                    <td className={cn(cell, "text-right tabular-nums")}>{order.itemCount}</td>
                    <td className={cn(cell, "text-right whitespace-nowrap tabular-nums")}>
                      {formatPrice(order.total)}
                    </td>
                    <td className={cell}>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-caption font-medium",
                          order.status === "delivered"
                            ? "bg-success/10 text-success"
                            : "bg-surface text-ink/60",
                        )}
                      >
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className={cn(cell, "text-right")}>
                      <Link
                        href={`/admin/orders/${order.orderNumber}`}
                        aria-label={`View order ${order.orderNumber}`}
                        className="rounded-[9px] border border-border px-3 py-1.5 text-secondary font-medium hover:bg-surface"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  );
}
