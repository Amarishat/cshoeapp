"use client";

import Image from "next/image";
import { Checkbox } from "@/components/ui/Checkbox";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { cn } from "@/lib/cn";
import { formatPrice, isSelected } from "@/lib/pricing";
import type { BagProduct, CartItem } from "@/lib/types";

/**
 * One bag item (Figma 1:2782 / 1:2755 / 1:2734): checkbox, shoe cut-out with a
 * soft shadow, "Qty" + pill stepper underneath; details column 186px in with
 * an optional "Customised" label, name, category, size, MRP and tax note.
 */
export function BagItemRow({
  item,
  product,
  onQuantityChange,
  onSelectedChange,
  onRemoveRequest,
  className,
}: {
  item: CartItem;
  product: BagProduct;
  onQuantityChange: (quantity: number) => void;
  onSelectedChange: (selected: boolean) => void;
  onRemoveRequest: () => void;
  className?: string;
}) {
  const customised = !!item.customization && Object.keys(item.customization).length > 0;
  const sizeLabel = item.size.replace(/^UK /, "");

  return (
    <li className={cn("grid grid-cols-[minmax(159px,186fr)_204fr]", className)}>
      <div className="relative flex min-w-0 flex-col">
        <Checkbox
          checked={isSelected(item)}
          onChange={onSelectedChange}
          label={`Include ${product.name}, size ${sizeLabel}, in order`}
          className="absolute top-px left-0"
        />
        <div
          className="relative mt-[6px] ml-[29px] h-[133px] w-[calc(100%-29px)] max-w-[150px]"
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
        <div className="mt-[9px] ml-[29px] flex items-center gap-[11px]">
          <span id={`qty-${item.id}`} className="text-body font-medium">
            Qty
          </span>
          <div role="group" aria-labelledby={`qty-${item.id}`}>
            <QtyStepper
              value={item.quantity}
              onChange={onQuantityChange}
              onRemoveRequest={onRemoveRequest}
            />
          </div>
        </div>
      </div>

      <div className={cn("min-w-0", !customised && "pt-[43px]")}>
        {customised && (
          <p className="flex items-center gap-[14px] text-body font-medium">
            Customised
            <Image
              src="/images/icons/customise.png"
              alt=""
              width={24}
              height={22}
              className="h-[22px] w-6 object-cover"
            />
          </p>
        )}
        <h2 className={cn("truncate text-body font-medium", customised && "mt-[25px]")}>
          {product.name}
        </h2>
        <p className="mt-px truncate text-secondary text-ink/30">{product.category}</p>
        <p className="mt-[3px] text-[17px]">Size {sizeLabel}</p>
        <p className="mt-[5px] text-[17px]">
          MRP : <span className="font-semibold">{formatPrice(product.price)}</span>
        </p>
        <p className="mt-[5px] text-caption leading-[18px] font-medium text-ink/30">
          Incl. of taxes
          <br />
          (Also includes all applicable duties)
        </p>
      </div>
    </li>
  );
}
