"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { ButtonLink } from "@/components/ui/Button";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { Icon } from "@/components/ui/Icon";
import { MOCK_ARRIVAL_LABEL, MOCK_DELIVERY_DAY } from "@/lib/data/delivery";
import { upiApps } from "@/lib/data/paymentMethods";
import { getOrderByNumber } from "@/lib/data/userOrders";
import { orderDetailProgress, orderStatusView, orderSummaryText } from "@/lib/orders";
import { formatAmount, formatPrice } from "@/lib/pricing";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";
import { useShareFeedback } from "@/lib/useShareFeedback";
import type { Order, OrderLine } from "@/lib/types";
import { OrderTimeline } from "./OrderTimeline";

/** Search field from Figma (same look as My Orders); submitting opens /orders with the query. */
function OrdersSearchLink() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/orders?q=${encodeURIComponent(q)}` : "/orders");
  }

  return (
    <form role="search" onSubmit={submit} className="px-gutter">
      <label className="flex h-[55px] items-center gap-[15px] rounded-[9px] border border-border bg-white px-3">
        <button type="submit" aria-label="Search your orders" className="flex">
          <Icon name="search" className="size-[30px]" />
        </button>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your order here"
          enterKeyHint="search"
          className="min-w-0 flex-1 appearance-none bg-transparent text-[17px] outline-none placeholder:text-ink/50 [&::-webkit-search-cancel-button]:appearance-none"
        />
      </label>
    </form>
  );
}

/** One order line: details left, cut-out right (Figma 1:3885, minus the seller line). */
function LineRow({ line }: { line: OrderLine }) {
  const customised = !!line.customization && Object.keys(line.customization).length > 0;
  return (
    <li className="flex items-start justify-between gap-4 py-5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        {customised && (
          <p className="mb-1 flex items-center gap-2 text-[15px] font-medium">
            Customised
            <Image src="/images/icons/customise.png" alt="" width={17} height={16} className="h-4 w-[17px] object-cover" />
          </p>
        )}
        <h3 className="truncate text-[17px] font-medium">{line.name}</h3>
        <p className="mt-1 text-[15px] text-ink/50">
          Size : {line.size.replace(/^UK /, "")} · Qty : {line.quantity}
        </p>
        <p className="mt-2 text-[17px] font-semibold">{formatPrice(line.unitPrice * line.quantity)}</p>
        {line.quantity > 1 && (
          <p className="text-[15px] text-ink/50">
            {formatPrice(line.unitPrice)} × {line.quantity}
          </p>
        )}
      </div>
      <div
        className="relative h-[82px] w-[130px] shrink-0"
        style={{ filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))" }}
      >
        <Image
          src={line.image.src}
          alt={line.name}
          fill
          sizes="130px"
          className={line.image.fit === "cover" ? "object-cover" : "object-contain"}
        />
      </div>
    </li>
  );
}

/** Unavailable V1 action, kept visible to match Figma. */
function SoonAction({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-disabled="true" className={className}>
      {children}
    </div>
  );
}

/**
 * "Send Order Details" row (Figma 1:3944): shares a plain-text summary of this
 * order via the share sheet, or copies it and confirms below the row.
 */
function SendOrderDetails({ order }: { order: Order }) {
  const { feedback, share } = useShareFeedback();

  function onClick() {
    const text = orderSummaryText(order);
    void share({
      data: { title: `Order ${order.id}`, text },
      copyText: text,
      copied: "Order details copied",
      failed: "Couldn't copy order details",
    });
  }

  return (
    <div className="relative mt-10">
      <button
        type="button"
        onClick={onClick}
        aria-label={`Send order details for order ${order.id}`}
        className="flex h-[63px] w-full items-center gap-2.5 bg-white pr-[14px] pl-[18px] text-left shadow-[0_-0.5px_0.5px_#ccc,0_0.5px_0.5px_#ccc]"
      >
        <Image src="/images/orders/share.svg" alt="" width={24} height={24} unoptimized />
        <span className="flex-1 text-[17px]">Send Order Details</span>
        <Image src="/images/orders/chevron-right.svg" alt="" width={24} height={24} unoptimized />
      </button>
      {/* Sits in the gap below the row, so the layout never shifts. */}
      <span
        role="status"
        className={
          feedback
            ? "absolute top-full right-[14px] z-10 mt-2 rounded-full bg-ink px-2.5 py-1 text-[12px] font-medium whitespace-nowrap text-white"
            : "sr-only"
        }
      >
        {feedback}
      </span>
    </div>
  );
}

function Details({ order }: { order: Order }) {
  const status = orderStatusView(order);
  const pairs = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const app = upiApps.find((a) => a.id === order.payment.app);
  const { address, totals } = order;
  const priceRows: [string, number][] = [
    [`Price (${pairs} ${pairs === 1 ? "item" : "items"})`, totals.subtotal],
    ["Discount", totals.discount],
    ["Delivery Charges", totals.delivery],
    ["Platform Fee", totals.platformFee],
  ];

  return (
    <div className="pb-10">
      <div className="mt-[30px]">
        <OrdersSearchLink />
      </div>

      <section aria-labelledby="order-status-heading">
        <h2 id="order-status-heading" className="mt-10 px-gutter text-body font-medium">
          {status.sectionTitle}
        </h2>

        <p className="mt-6 border-y border-border py-[10px] px-gutter text-caption text-ink/70">
          Order ID - {order.id}
        </p>

        {/* Status, arrival and every line of this order */}
        <div className="px-gutter pt-6 pb-[21px]">
          <p className="text-[17px] font-medium text-[#fba627]">{status.label}</p>
          {status.showArrival && <p className="mt-1 text-[17px]">{MOCK_ARRIVAL_LABEL}</p>}
          <ul aria-label="Items" className="mt-4 divide-y divide-[#d9d9d9]">
            {order.lines.map((line) => (
              <LineRow key={line.bagItemId} line={line} />
            ))}
          </ul>
        </div>
      </section>

      {/* Tracker */}
      <section aria-label="Delivery progress" className="border-t border-[#d9d9d9] px-gutter pt-6">
        <OrderTimeline steps={orderDetailProgress(order, MOCK_DELIVERY_DAY)} />
        <Link
          href={`/orders/${encodeURIComponent(order.id)}/track`}
          className="mt-[30px] flex w-fit items-center gap-2 text-[17px] font-medium"
        >
          View Delivery Status
          <Icon name="chevronDown" className="size-5 -rotate-90" />
        </Link>
      </section>

      {/* Edit Order | Chat with us */}
      <div className="mt-11 grid h-[67px] grid-cols-2 border-y border-[#d9d9d9] shadow-[0_-2px_4px_rgba(0,0,0,0.04),0_2px_4px_rgba(0,0,0,0.04)]">
        <SoonAction className="flex flex-col items-center justify-center gap-1 border-r border-[#d9d9d9] text-[17px] font-medium text-ink/40">
          Edit Order
          <ComingSoonBadge />
        </SoonAction>
        <SoonAction className="flex flex-col items-center justify-center gap-1 text-[17px] font-medium text-ink/40">
          <span className="flex items-center gap-2">
            <Image src="/images/orders/chat.svg" alt="" width={24} height={23} unoptimized className="opacity-40" />
            Chat with us
          </span>
          <ComingSoonBadge />
        </SoonAction>
      </div>

      {/* Send Order Details (recommendation rows from Figma are omitted in V1) */}
      <SendOrderDetails order={order} />

      {/* Shipping details */}
      <section aria-labelledby="shipping-heading" className="mt-10">
        <h2 id="shipping-heading" className="px-gutter text-[15px] text-ink/70">
          Shipping Details
        </h2>
        <address className="mt-[17px] border-y border-[#d9d9d9] px-gutter pt-[18px] pb-[27px] text-[17px] not-italic">
          <span className="block text-body">{address.fullName}</span>
          <span className="mt-[21px] block">
            {address.street}, {address.area}
          </span>
          <span className="block">{address.city}</span>
          <span className="block">
            {address.state} - {address.pincode}
          </span>
          <span className="mt-2 block">Phone Number : {address.phone}</span>
        </address>
      </section>

      {/* Price details (V1 structure, from the saved order totals) */}
      <section aria-labelledby="price-heading">
        <h2 id="price-heading" className="mt-[21px] px-gutter text-[17px] font-medium">
          Price Details
        </h2>
        <dl className="mt-5 border-t border-[#d9d9d9] text-[17px]">
          <div className="flex flex-col gap-[15px] px-gutter pt-[26px] pb-4">
            {priceRows.map(([label, amount]) => (
              <div key={label} className="flex items-center justify-between">
                <dt>{label}</dt>
                <dd className="font-medium">{formatAmount(amount)}</dd>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-y border-[#d9d9d9] px-gutter py-[13px]">
            <dt>Total Amount</dt>
            <dd className="font-semibold">{formatAmount(totals.total)}</dd>
          </div>
        </dl>
        <p className="mt-4 px-gutter text-[15px] text-ink/70">
          Paid via {app?.name ?? order.payment.app} (UPI)
        </p>
      </section>
    </div>
  );
}

/**
 * Order Details — Figma frame 1:3878. `orderId` is the Supabase order number
 * from the URL; the order is read from Supabase (orders saved only on this
 * device by V1 are not shown).
 */
export function OrderDetailsView({ orderId }: { orderId: string }) {
  const { state, retry } = useCatalogueLoad(getOrderByNumber, orderId);

  if (state.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading order" className="animate-pulse px-gutter pb-10">
        <div className="mt-[30px] h-[55px] rounded-[9px] bg-surface" />
        <div className="mt-10 h-6 w-44 rounded bg-surface" />
        <div className="mt-6 h-[260px] rounded bg-surface" />
        <div className="mt-10 h-[200px] rounded bg-surface" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="mt-[30px]">
        <CatalogueError title="Couldn’t load this order." message={state.message} onRetry={retry} />
      </div>
    );
  }

  const order = state.data;
  if (!order) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-gutter pt-24 pb-32 text-center">
        <h2 className="text-body font-medium">Order not found</h2>
        <p className="mt-2 text-secondary text-ink/50">We couldn’t find an order with this ID.</p>
        <ButtonLink href="/orders" size="lg" className="mt-8 w-[222px]">
          Back to My Orders
        </ButtonLink>
      </div>
    );
  }

  return <Details order={order} />;
}
