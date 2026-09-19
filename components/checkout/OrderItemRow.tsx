"use client";

import Image from "next/image";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { MOCK_DELIVERY_LABEL } from "@/lib/data/delivery";
import { formatPrice } from "@/lib/pricing";
import type { BagProduct, CartItem } from "@/lib/types";

/**
 * Order Summary item (Figma 1:3617): cut-out with soft shadow, "Qty" + pill
 * stepper under it, details column (name, category, "Size: 7", MRP, tax note)
 * and the delivery estimate row.
 */
export function OrderItemRow({
  item,
  product,
  onQuantityChange,
  onRemoveRequest,
}: {
  item: CartItem;
  product: BagProduct;
  onQuantityChange: (quantity: number) => void;
  onRemoveRequest: () => void;
}) {
  const sizeLabel = item.size.replace(/^UK /, "");

  return (
    <li className="border-b border-[#d9d9d9] pt-5 pb-[38px]">
      <div className="grid grid-cols-[minmax(150px,170fr)_220fr]">
        <div className="min-w-0">
          <div
            className="relative h-[133px] w-full max-w-[150px]"
            style={{ filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))" }}
          >
            <Image
              src={product.image.src}
              alt={product.name}
              fill
              sizes="150px"
              className={product.image.fit === "cover" ? "object-cover" : "object-contain"}
            />
          </div>
          <div className="mt-[11px] flex items-center gap-2">
            <span id={`os-qty-${item.id}`} className="text-[17px] font-medium">
              Qty
            </span>
            <div role="group" aria-labelledby={`os-qty-${item.id}`}>
              <QtyStepper
                value={item.quantity}
                onChange={onQuantityChange}
                onRemoveRequest={onRemoveRequest}
              />
            </div>
          </div>
        </div>
        <div className="min-w-0 pt-10">
          <h3 className="truncate text-body font-medium">{product.name}</h3>
          <p className="mt-px truncate text-secondary text-ink/50">{product.category}</p>
          <p className="mt-[7px] text-[15px] font-semibold text-ink/90">Size: {sizeLabel}</p>
          <p className="mt-[5px] text-body font-medium">
            MRP : <span className="font-semibold">{formatPrice(product.price)}</span>
          </p>
          <p className="mt-[5px] text-caption leading-[19px] font-medium text-ink/30">
            Incl. of taxes
            <br />
            (Also includes all applicable duties)
          </p>
        </div>
      </div>
      <p className="mt-[22px] text-[15px] text-ink/50">{MOCK_DELIVERY_LABEL}</p>
    </li>
  );
}
