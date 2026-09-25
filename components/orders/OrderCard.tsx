import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { arrivingByLabel, cancelledLabel, orderProgress, orderStatusView } from "@/lib/orders";
import type { Order } from "@/lib/types";
import { OrderProgress } from "./OrderProgress";

const button = "flex h-11 items-center justify-center rounded-[7px] text-[15px] font-medium";

/**
 * One order (Figma 1:3672 – 1:3703): tracker, primary item (first line) with
 * "+N more items", arrival estimate, and Cancel / View Order. Cancel is a real
 * action only while the order is "confirmed" (`onCancel`, which asks for
 * confirmation first). A delivered order reads as completed ("Completed
 * Order", "Delivered on <date>", Figma 1:3715) and a cancelled one shows when it was
 * cancelled — neither with an arrival date, and both with only View Order.
 */
export function OrderCard({
  order,
  onCancel,
  cancelling = false,
  cancelError,
}: {
  order: Order;
  onCancel?: () => void;
  cancelling?: boolean;
  /** Why the last cancel attempt failed, shown under the buttons. */
  cancelError?: string;
}) {
  const [first, ...rest] = order.lines;
  const size = first.size.replace(/^UK /, "");
  const { tone, label } = orderStatusView(order);
  const cancelled = tone === "cancelled";
  // Delivered and cancelled orders are finished: no Cancel, just View Order.
  const finished = tone !== "progress";
  const cancellable = order.status === "confirmed";

  return (
    <article aria-label={`Order ${order.id}`}>
      <OrderProgress steps={orderProgress(order)} />

      <div className="mt-10 grid grid-cols-[minmax(150px,186fr)_204fr] items-center">
        <div
          className="relative ml-[15px] h-[90px] w-[calc(100%-15px)] max-w-[143px]"
          style={{ filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))" }}
        >
          <Image
            src={first.image.src}
            alt={first.name}
            fill
            sizes="143px"
            className={first.image.fit === "cover" ? "object-cover" : "object-contain"}
          />
        </div>
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold">
            {cancelled ? "Cancelled Order" : tone === "delivered" ? "Completed Order" : "In Progress Order"}
          </h3>
          <p className="mt-px truncate text-secondary font-medium text-ink/30">{first.name}</p>
          {rest.length > 0 && (
            <p className="text-[14px] font-medium text-ink/50">
              +{rest.length} more {rest.length === 1 ? "item" : "items"}
            </p>
          )}
          <p className="mt-[3px] text-[15px] font-medium text-ink/90">Size : {size}</p>
          {cancelled ? (
            <p className="mt-[3px] text-secondary font-medium text-danger">{cancelledLabel(order)}</p>
          ) : tone === "delivered" ? (
            // "Delivered on 25 Sep 2026", or just "Delivered" when the time wasn't recorded.
            <p className="mt-[3px] text-secondary font-medium text-success">{label}</p>
          ) : (
            <p className="mt-[3px] text-secondary font-medium text-success">{arrivingByLabel(order.createdAt)}</p>
          )}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-[30px]">
        {cancellable && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            aria-label={`Cancel order ${order.id}`}
            className={cn(button, "border border-border bg-white disabled:text-ink/40")}
          >
            {cancelling ? "Cancelling…" : "Cancel"}
          </button>
        ) : (
          !finished && (
            // Past "confirmed" the order has shipped and can no longer be cancelled.
            <div aria-disabled="true" className={cn(button, "border border-border bg-white text-ink/40")}>
              Cancel
              <span className="sr-only"> (not available once an order has shipped)</span>
            </div>
          )
        )}
        <Link
          href={`/orders/${order.id}`}
          className={cn(button, "bg-primary text-white", finished && "col-span-2")}
        >
          View Order
        </Link>
      </div>
      {cancelError && (
        <p role="alert" className="mt-3 text-[15px] text-danger [overflow-wrap:anywhere]">
          {cancelError}
        </p>
      )}
    </article>
  );
}
