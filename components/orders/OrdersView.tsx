"use client";

import { useState } from "react";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { listOrders } from "@/lib/data/userOrders";
import { orderMatches } from "@/lib/orders";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";
import { OrderCard } from "./OrderCard";

function NoOrders() {
  // Not in Figma — same minimal treatment as the empty Bag.
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-gutter pt-24 pb-32 text-center">
      <Icon name="bag" className="size-12 text-ink/30" />
      <h2 className="mt-4 text-body font-medium">No orders yet</h2>
      <ButtonLink href="/" size="lg" className="mt-8 w-[222px]">
        Start Shopping
      </ButtonLink>
    </div>
  );
}

/**
 * My Orders body — Figma frame 1:3647. Orders are the guest's Supabase orders
 * (newest first); orders saved only on this device by V1 are not shown.
 * V1 orders are always in progress, so "Completed Orders" is hidden unless a
 * delivered order exists.
 */
export function OrdersView({ initialQuery = "" }: { initialQuery?: string }) {
  const { state, retry } = useCatalogueLoad(listOrders);
  const [query, setQuery] = useState(initialQuery);

  if (state.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading your orders" className="animate-pulse px-gutter pb-10">
        <div className="mt-[30px] h-[55px] rounded-[9px] bg-surface" />
        <div className="mt-10 h-6 w-40 rounded bg-surface" />
        <div className="mt-6 h-[300px] rounded bg-surface" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="mt-[30px]">
        <CatalogueError title="Couldn’t load your orders." message={state.message} onRetry={retry} />
      </div>
    );
  }

  const orders = state.data;
  if (orders.length === 0) return <NoOrders />;

  const matching = orders.filter((order) => orderMatches(order, query));
  const inProgress = matching.filter((order) => order.status !== "delivered");
  const completed = matching.filter((order) => order.status === "delivered");

  return (
    <div className="pb-10">
      <div className="mt-[30px] px-gutter">
        <label className="flex h-[55px] items-center gap-[15px] rounded-[9px] border border-border bg-white px-3">
          <Icon name="search" className="size-[30px]" />
          <span className="sr-only">Search your orders</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your order here"
            className="min-w-0 flex-1 appearance-none bg-transparent text-[17px] outline-none placeholder:text-ink/50 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </label>
      </div>

      <p role="status" className="sr-only">
        {query ? `${matching.length} ${matching.length === 1 ? "order" : "orders"} found` : ""}
      </p>

      {matching.length === 0 && (
        <p className="mt-10 px-gutter text-center text-secondary text-ink/50">
          No orders match “{query.trim()}”.
        </p>
      )}

      {inProgress.length > 0 && (
        <section aria-labelledby="orders-in-progress" className="mt-10 px-gutter">
          <h2 id="orders-in-progress" className="text-body font-medium">
            In Progress Order
          </h2>
          <ul className="mt-6">
            {inProgress.map((order, index) => (
              <li
                key={order.id}
                className={index > 0 ? "mt-10 border-t border-[#d9d9d9] pt-10" : undefined}
              >
                <OrderCard order={order} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Figma's "Completed Orders" section — only when a delivered order exists (never in V1). */}
      {completed.length > 0 && (
        <section aria-labelledby="orders-completed" className="mt-10 border-t border-[#d9d9d9] px-gutter pt-10">
          <h2 id="orders-completed" className="text-body font-medium">
            Completed Orders
          </h2>
          <ul className="mt-6 flex flex-col gap-10">
            {completed.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
