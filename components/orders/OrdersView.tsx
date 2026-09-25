"use client";

import { useState } from "react";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { cancelOrder, getOrderByNumber, listOrders } from "@/lib/data/userOrders";
import { orderMatches } from "@/lib/orders";
import type { Order } from "@/lib/types";
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
 * (newest first).
 * "Completed Orders" (delivered) and "Cancelled Orders" only appear when such
 * an order exists; cancelled orders stay listed, never among the in-progress
 * ones.
 *
 * A confirmed order can be cancelled from its card: after the confirmation
 * dialog, public.cancel_order() does it and the order is read again, so the
 * card shows its real cancelled state.
 */
export function OrdersView({ initialQuery = "" }: { initialQuery?: string }) {
  const { state, retry } = useCatalogueLoad(listOrders);
  const [query, setQuery] = useState(initialQuery);
  // Orders re-read after a change (by order number), shown in place of the loaded copy.
  const [updated, setUpdated] = useState<Record<string, Order>>({});
  const [confirming, setConfirming] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelErrors, setCancelErrors] = useState<Record<string, string>>({});

  async function cancel(order: Order) {
    setConfirming(null);
    setCancelling(order.id);
    setCancelErrors((errors) => {
      const rest = { ...errors };
      delete rest[order.id];
      return rest;
    });
    try {
      await cancelOrder(order.id);
      const fresh = await getOrderByNumber(order.id);
      if (fresh) setUpdated((orders) => ({ ...orders, [order.id]: fresh }));
      // Cancelled, but it couldn't be read back: reload the whole list.
      else retry();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCancelErrors((errors) => ({ ...errors, [order.id]: message }));
      // Refused (e.g. it has shipped since this list was loaded): show the order as it is now,
      // so its Cancel button goes away. The error above stays with the order.
      try {
        const fresh = await getOrderByNumber(order.id);
        if (fresh) setUpdated((orders) => ({ ...orders, [order.id]: fresh }));
      } catch {
        // Couldn't re-read it: the error is still shown, and a reload shows the real state.
      }
    } finally {
      setCancelling(null);
    }
  }

  function card(order: Order) {
    return (
      <OrderCard
        order={order}
        onCancel={() => setConfirming(order)}
        cancelling={cancelling === order.id}
        cancelError={cancelErrors[order.id]}
      />
    );
  }

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

  const orders = state.data.map((order) => updated[order.id] ?? order);
  if (orders.length === 0) return <NoOrders />;

  const matching = orders.filter((order) => orderMatches(order, query));
  const inProgress = matching.filter((order) => order.status !== "delivered" && order.status !== "cancelled");
  const completed = matching.filter((order) => order.status === "delivered");
  const cancelled = matching.filter((order) => order.status === "cancelled");

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
                {card(order)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Figma's "Completed Orders" section — only when a delivered order exists. */}
      {completed.length > 0 && (
        <section aria-labelledby="orders-completed" className="mt-10 border-t border-[#d9d9d9] px-gutter pt-10">
          <h2 id="orders-completed" className="text-body font-medium">
            Completed Orders
          </h2>
          <ul className="mt-6 flex flex-col gap-10">
            {completed.map((order) => (
              <li key={order.id}>{card(order)}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Cancelled orders stay visible, after the rest (not in Figma; same layout as Completed). */}
      {cancelled.length > 0 && (
        <section aria-labelledby="orders-cancelled" className="mt-10 border-t border-[#d9d9d9] px-gutter pt-10">
          <h2 id="orders-cancelled" className="text-body font-medium">
            Cancelled Orders
          </h2>
          <ul className="mt-6 flex flex-col gap-10">
            {cancelled.map((order) => (
              <li key={order.id}>{card(order)}</li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirming !== null}
        title="Cancel this order?"
        message={
          confirming
            ? `Order ${confirming.id} will be cancelled. This can’t be undone.`
            : undefined
        }
        confirmLabel="Cancel Order"
        cancelLabel="Keep Order"
        onConfirm={() => confirming && void cancel(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
