"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BarList } from "@/components/admin/charts/BarList";
import { ColumnChart, type ColumnPoint } from "@/components/admin/charts/ColumnChart";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import type { DailySales, OrderStats } from "@/lib/adminDashboardStats";
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
  cancelled: "Cancelled",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The catalogue counts sit on the Manage cards; orders have their own figures above. */
const QUICK_ACTIONS: {
  label: string;
  href: string;
  detail: string;
  count?: (data: AdminDashboard) => string;
}[] = [
  {
    label: "Products",
    href: "/admin/products",
    detail: "Catalogue and product pages",
    count: (d) => plural(d.productCount, "product"),
  },
  { label: "Brands", href: "/admin/brands", detail: "Names, logos and order", count: (d) => plural(d.brandCount, "brand") },
  {
    label: "Customizer",
    href: "/admin/customizer",
    detail: "Parts and colours",
    count: (d) => plural(d.customizerCount, "config"),
  },
  { label: "Orders", href: "/admin/orders", detail: "What customers have bought" },
];

const cell = "px-4 py-3 text-left align-middle";
const head = `${cell} text-secondary font-medium text-ink/60`;
const card = "rounded-card border border-border bg-page";

/** Compact rupees for chart axes, Indian style: ₹0, ₹5K, ₹1.5L, ₹1.2Cr. */
const compactRupees = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

function plural(n: number, noun: string): string {
  return `${n.toLocaleString("en-IN")} ${noun}${n === 1 ? "" : "s"}`;
}

/** Share of a total as a whole percentage ("0%" when the total is 0). */
function percent(part: number, total: number): string {
  return `${total === 0 ? 0 : Math.round((part / total) * 100)}%`;
}

/** A "YYYY-MM-DD" local day key as a local Date. */
function dayFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toColumnPoints(days: DailySales[]): ColumnPoint[] {
  return days.map((day) => {
    const date = dayFromKey(day.date);
    return {
      key: day.date,
      label: formatEventDate(date.toISOString()),
      tickLabel: `${date.getDate()} ${MONTHS[date.getMonth()]}`,
      value: day.revenue,
      detail: plural(day.orders, "order"),
    };
  });
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className={cn(card, "min-w-0 px-4 py-4 sm:px-5")}>
      <p className="text-secondary text-ink/60">{label}</p>
      <p className="mt-1 text-heading font-semibold [overflow-wrap:anywhere]">{value}</p>
      {note && <p className="mt-0.5 text-caption text-ink/50">{note}</p>}
    </div>
  );
}

function KpiPlaceholder() {
  return (
    <div className={cn(card, "min-w-0 px-4 py-4 sm:px-5")}>
      <span className="block h-4 w-24 rounded bg-surface" />
      <span className="mt-2 block h-7 w-20 rounded bg-surface" />
    </div>
  );
}

/** A white dashboard card with a heading, an optional subtitle and a right-hand aside. */
function Panel({
  id,
  title,
  subtitle,
  aside,
  loading,
  className,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  loading?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} aria-busy={loading} className={cn(card, "min-w-0 p-4 sm:p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id={id} className="text-body font-semibold">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-secondary text-ink/60">{subtitle}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PanelPlaceholder({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          <span className="block h-4 w-1/3 rounded bg-surface" />
          <span className="mt-2 block h-2 rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}

function ChartPlaceholder() {
  return <div aria-hidden className="mt-14 h-56 animate-pulse rounded-input bg-surface" />;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-secondary text-ink/60">{children}</p>;
}

function SalesOverview({ stats }: { stats: OrderStats | null }) {
  const days = stats?.last30Days ?? [];
  const revenue = days.reduce((sum, day) => sum + day.revenue, 0);
  const orders = days.reduce((sum, day) => sum + day.orders, 0);

  return (
    <Panel
      id="sales-overview"
      title="Sales overview"
      subtitle="Revenue per day, last 30 days, excluding cancelled orders"
      className="mt-4 sm:mt-6"
      loading={!stats}
      aside={
        stats && (
          <dl className="flex gap-6 sm:gap-8 sm:text-right">
            <div>
              <dt className="text-caption text-ink/50">30-day revenue</dt>
              <dd className="text-label font-semibold">{formatPrice(revenue)}</dd>
            </div>
            <div>
              <dt className="text-caption text-ink/50">30-day orders</dt>
              <dd className="text-label font-semibold">{orders.toLocaleString("en-IN")}</dd>
            </div>
          </dl>
        )
      }
    >
      {!stats ? (
        <ChartPlaceholder />
      ) : (
        <>
          {orders === 0 && (
            <p className="text-secondary text-ink/60">No sales in the last 30 days — every day below is empty.</p>
          )}
          <ColumnChart
            points={toColumnPoints(days)}
            label="Revenue per day, last 30 days"
            formatValue={formatPrice}
            formatTick={(value) => `₹${compactRupees.format(value)}`}
            valueHeading="Revenue"
            detailHeading="Orders"
          />
        </>
      )}
    </Panel>
  );
}

function OrderStatusPanel({ stats }: { stats: OrderStats | null }) {
  return (
    <Panel id="order-status" title="Order status" subtitle="Where every order is now" loading={!stats}>
      {!stats ? (
        <PanelPlaceholder />
      ) : stats.totalOrders === 0 ? (
        <Empty>No orders yet.</Empty>
      ) : (
        <BarList
          label="Orders by status"
          items={stats.statusBreakdown.map(({ status, count }) => ({
            key: status,
            label: STATUS_LABEL[status],
            detail: `${percent(count, stats.totalOrders)} of orders`,
            value: count,
            valueLabel: count.toLocaleString("en-IN"),
          }))}
        />
      )}
    </Panel>
  );
}

function CustomisationPanel({ stats }: { stats: OrderStats | null }) {
  return (
    <Panel id="customisation" title="Customisation" subtitle="Units sold, standard vs customised" loading={!stats}>
      {!stats ? (
        <PanelPlaceholder rows={2} />
      ) : stats.unitsSold === 0 ? (
        <Empty>No units sold yet.</Empty>
      ) : (
        <BarList
          label="Units sold by type"
          // Both bars share the total as their scale, so their lengths are shares of all units.
          max={stats.unitsSold}
          items={[
            {
              key: "standard",
              label: "Standard",
              detail: `${percent(stats.standardUnits, stats.unitsSold)} of units`,
              value: stats.standardUnits,
              valueLabel: plural(stats.standardUnits, "unit"),
            },
            {
              key: "customised",
              label: "Customised",
              detail: `${percent(stats.customizedUnits, stats.unitsSold)} of units`,
              value: stats.customizedUnits,
              valueLabel: plural(stats.customizedUnits, "unit"),
            },
          ]}
        />
      )}
    </Panel>
  );
}

function TopProductsPanel({ stats }: { stats: OrderStats | null }) {
  return (
    <Panel id="top-products" title="Top products" subtitle="Top 5 by units sold, all time" loading={!stats}>
      {!stats ? (
        <PanelPlaceholder rows={5} />
      ) : stats.topProducts.length === 0 ? (
        <Empty>No products sold yet.</Empty>
      ) : (
        <BarList
          label="Top products by units sold"
          items={stats.topProducts.map((product) => ({
            key: product.name,
            label: product.name,
            detail: product.category,
            value: product.units,
            valueLabel: plural(product.units, "unit"),
            subValueLabel: formatPrice(product.revenue),
          }))}
        />
      )}
    </Panel>
  );
}

/**
 * Admin home — sales figures and charts from the real orders, the newest
 * orders, and links into the screens that manage the catalogue (with their
 * counts). Read-only.
 */
export function AdminDashboardView() {
  const { state, retry } = useCatalogueLoad(loadAdminDashboard);
  const data = state.status === "ready" ? state.data : null;
  const stats = data?.stats ?? null;
  const failed = state.status === "error";

  return (
    <div className="max-w-300">
      <h1 className="text-heading font-semibold">Cshoe Admin</h1>
      <p className="mt-2 text-secondary text-ink/60">Welcome back</p>

      {failed && (
        <div className="mt-8">
          <CatalogueError title="Couldn’t load the dashboard." message={state.message} onRetry={retry} />
        </div>
      )}

      {!failed && (
        <>
          {/* KPIs */}
          <section aria-labelledby="kpis" className="mt-8" aria-busy={!stats}>
            <h2 id="kpis" className="sr-only">
              Sales totals
            </h2>
            <div className={cn("grid grid-cols-1 gap-3 min-[431px]:grid-cols-2 sm:gap-4 xl:grid-cols-4", !stats && "animate-pulse")}>
              {stats ? (
                <>
                  <Kpi
                    label="Revenue"
                    value={formatPrice(stats.totalRevenue)}
                    note="Order totals incl. fees, excl. cancelled"
                  />
                  <Kpi
                    label="Orders"
                    value={stats.totalOrders.toLocaleString("en-IN")}
                    note={stats.cancelledOrders > 0 ? `Incl. ${stats.cancelledOrders.toLocaleString("en-IN")} cancelled` : undefined}
                  />
                  <Kpi label="Average order value" value={formatPrice(stats.averageOrderValue)} />
                  <Kpi label="Units sold" value={stats.unitsSold.toLocaleString("en-IN")} />
                </>
              ) : (
                [0, 1, 2, 3].map((i) => <KpiPlaceholder key={i} />)
              )}
            </div>
          </section>

          <SalesOverview stats={stats} />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-2">
            <OrderStatusPanel stats={stats} />
            <CustomisationPanel stats={stats} />
          </div>
          <div className="mt-4 sm:mt-6">
            <TopProductsPanel stats={stats} />
          </div>

          {/* Recent orders */}
          <section aria-labelledby="recent-orders" className="mt-10" aria-busy={!data}>
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
                              order.status === "delivered" ? "bg-success/10 text-success" : "bg-surface text-ink/60",
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
        </>
      )}

      {/* Quick actions — always available, even if the queries failed. */}
      <section aria-labelledby="quick-actions" className="mt-10">
        <h2 id="quick-actions" className="text-body font-semibold">
          Manage
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className={cn(card, "px-5 py-4 hover:bg-surface")}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-label font-medium">{action.label}</span>
                {action.count &&
                  (data ? (
                    <span className="text-caption text-ink/60 tabular-nums">{action.count(data)}</span>
                  ) : (
                    !failed && <span aria-hidden className="h-3 w-14 animate-pulse rounded bg-surface" />
                  ))}
              </span>
              <span className="mt-1 block text-caption text-ink/50">{action.detail}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export type { AdminDashboard };
