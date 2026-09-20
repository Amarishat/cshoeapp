"use client";

import Link from "next/link";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { cn } from "@/lib/cn";
import { loadAdminDashboard, type AdminDashboard } from "@/lib/data/adminDashboard";
import { formatEventDate } from "@/lib/orders";
import { formatPrice } from "@/lib/pricing";
import type { OrderStatus } from "@/lib/types";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

const STATUS_LABEL: Record<OrderStatus, string> = {
  confirmed: "Confirmed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

const QUICK_ACTIONS = [
  { label: "Products", href: "/admin/products", detail: "Catalogue and product pages" },
  { label: "Brands", href: "/admin/brands", detail: "Names, logos and order" },
  { label: "Customizer", href: "/admin/customizer", detail: "Parts and colours" },
  { label: "Orders", href: "/admin/orders", detail: "What customers have bought" },
] as const;

const cell = "px-4 py-3 text-left align-middle";
const head = `${cell} text-secondary font-medium text-ink/60`;
const card = "rounded-card border border-border bg-page";

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className={cn(card, "px-5 py-4")}>
      <p className="text-secondary text-ink/60">{label}</p>
      <p className="mt-1 text-heading font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function KpiPlaceholder() {
  return (
    <div className={cn(card, "px-5 py-4")}>
      <span className="block h-4 w-24 rounded bg-surface" />
      <span className="mt-2 block h-7 w-12 rounded bg-surface" />
    </div>
  );
}

/**
 * Admin home — counts from the catalogue and orders tables, the newest orders,
 * and links into the screens that manage them. Read-only.
 */
export function AdminDashboardView() {
  const { state, retry } = useCatalogueLoad(loadAdminDashboard);
  const data = state.status === "ready" ? state.data : null;

  return (
    <div className="max-w-[900px]">
      <h1 className="text-heading font-semibold">Cshoe Admin</h1>
      <p className="mt-2 text-secondary text-ink/60">Welcome back</p>

      {state.status === "error" && (
        <div className="mt-8">
          <CatalogueError title="Couldn’t load the dashboard." message={state.message} onRetry={retry} />
        </div>
      )}

      {/* KPIs */}
      <section aria-labelledby="kpis" className="mt-8" aria-busy={state.status === "loading"}>
        <h2 id="kpis" className="sr-only">
          Totals
        </h2>
        {state.status === "error" ? null : (
          <div className={cn("grid grid-cols-4 gap-4", state.status === "loading" && "animate-pulse")}>
            {data ? (
              <>
                <Kpi label="Total products" value={data.productCount} />
                <Kpi label="Total brands" value={data.brandCount} />
                <Kpi label="Total orders" value={data.orderCount} />
                <Kpi label="Customizer configs" value={data.customizerCount} />
              </>
            ) : (
              [0, 1, 2, 3].map((i) => <KpiPlaceholder key={i} />)
            )}
          </div>
        )}
      </section>

      {/* Recent orders */}
      {state.status !== "error" && (
        <section aria-labelledby="recent-orders" className="mt-10" aria-busy={state.status === "loading"}>
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="recent-orders" className="text-body font-semibold">
              Recent orders
            </h2>
            <Link href="/admin/orders" className="text-secondary text-ink/60 underline">
              All orders
            </Link>
          </div>

          {!data ? (
            <div className={cn(card, "mt-4 animate-pulse p-4")}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-6 border-b border-border py-3 last:border-0">
                  <span className="h-4 w-36 rounded bg-surface" />
                  <span className="h-4 w-24 rounded bg-surface" />
                  <span className="h-4 w-20 rounded bg-surface" />
                </div>
              ))}
            </div>
          ) : data.recentOrders.length === 0 ? (
            <p className={cn(card, "mt-4 p-8 text-center text-secondary text-ink/60")}>
              No orders are visible to this account.
            </p>
          ) : (
            <div className={cn(card, "mt-4 overflow-x-auto")}>
              <table className="w-full border-collapse text-label">
                <caption className="sr-only">The five most recent orders</caption>
                <thead>
                  <tr>
                    <th scope="col" className={head}>
                      Order ID
                    </th>
                    <th scope="col" className={head}>
                      Placed
                    </th>
                    <th scope="col" className={head}>
                      Status
                    </th>
                    <th scope="col" className={cn(head, "text-right")}>
                      Items
                    </th>
                    <th scope="col" className={cn(head, "text-right")}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => (
                    <tr key={order.orderNumber} className="border-t border-border hover:bg-surface/60">
                      <td className={cn(cell, "font-medium tabular-nums")}>
                        <Link
                          href={`/admin/orders/${order.orderNumber}`}
                          aria-label={`View order ${order.orderNumber}`}
                          className="underline decoration-transparent hover:decoration-inherit"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className={cn(cell, "whitespace-nowrap")}>{formatEventDate(order.createdAt)}</td>
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
                      <td className={cn(cell, "text-right tabular-nums")}>{order.itemCount}</td>
                      <td className={cn(cell, "text-right whitespace-nowrap tabular-nums")}>
                        {formatPrice(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Quick actions — always available, even if the queries failed. */}
      <section aria-labelledby="quick-actions" className="mt-10">
        <h2 id="quick-actions" className="text-body font-semibold">
          Manage
        </h2>
        <div className="mt-4 grid grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn(card, "px-5 py-4 hover:bg-surface")}
            >
              <span className="block text-label font-medium">{action.label}</span>
              <span className="mt-1 block text-caption text-ink/50">{action.detail}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export type { AdminDashboard };
