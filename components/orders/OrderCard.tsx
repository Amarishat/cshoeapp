import Image from "next/image";
import Link from "next/link";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { arrivingByLabel, orderProgress } from "@/lib/orders";
import type { Order } from "@/lib/types";
import { OrderProgress } from "./OrderProgress";

/**
 * In-progress order (Figma 1:3672 – 1:3703): tracker, primary item (first
 * line) with "+N more items", arrival estimate, and Cancel / View Order.
 */
export function OrderCard({ order }: { order: Order }) {
  const [first, ...rest] = order.lines;
  const size = first.size.replace(/^UK /, "");

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
          <h3 className="text-[17px] font-semibold">In Progress Order</h3>
          <p className="mt-px truncate text-secondary font-medium text-ink/30">{first.name}</p>
          {rest.length > 0 && (
            <p className="text-[14px] font-medium text-ink/50">
              +{rest.length} more {rest.length === 1 ? "item" : "items"}
            </p>
          )}
          <p className="mt-[3px] text-[15px] font-medium text-ink/90">Size : {size}</p>
          <p className="mt-[3px] text-secondary font-medium text-success">{arrivingByLabel(order.createdAt)}</p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-[30px]">
        {/* Cancel stays visible to match Figma but isn't available in V1. */}
        <div
          aria-disabled="true"
          className="flex h-11 items-center justify-center gap-2 rounded-[7px] border border-border bg-white text-[15px] font-medium text-ink/40"
        >
          Cancel
          <ComingSoonBadge />
        </div>
        <Link
          href={`/orders/${order.id}`}
          className="flex h-11 items-center justify-center rounded-[7px] bg-primary text-[15px] font-medium text-white"
        >
          View Order
        </Link>
      </div>
    </article>
  );
}
