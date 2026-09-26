"use client";

import Image from "next/image";
import Link from "next/link";
import { Checkbox } from "@/components/ui/Checkbox";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { cn } from "@/lib/cn";
import { CUSTOMISATION_UNAVAILABLE_MESSAGE, STALE_DESIGN_MESSAGE } from "@/lib/customizationCheck";
import { hasCustomizerPage } from "@/lib/data/customizerPages";
import { getCustomizationConfig } from "@/lib/data/supabaseCatalog";
import { MAX_CART_QUANTITY } from "@/lib/data/userCart";
import { formatPrice, isSelected } from "@/lib/pricing";
import type { BagProduct, CartItem, CustomizationSelection } from "@/lib/types";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

// One request per customisable product, shared by every row of that product.
const configs = new Map<string, Promise<Awaited<ReturnType<typeof getCustomizationConfig>>>>();

function loadCustomizationConfig(productId: string) {
  const pending = configs.get(productId) ?? getCustomizationConfig(productId);
  configs.set(productId, pending);
  return pending;
}

/**
 * The chosen parts and colours of a customised item, in the customiser's part
 * order and with its names (e.g. "Vamp — Red"). Nothing is shown until the
 * customiser's parts and colours have loaded, or if they can't be loaded.
 */
function CustomizationDetails({
  productId,
  selection,
}: {
  productId: string;
  selection: CustomizationSelection;
}) {
  const { state } = useCatalogueLoad(loadCustomizationConfig, productId);
  const config = state.status === "ready" ? state.data : null;
  if (!config) return null;

  const chosen = config.parts.flatMap((part) => {
    const colour = config.colours.find((c) => c.id === selection[part.id]);
    return colour ? [{ id: part.id, label: `${part.name} — ${colour.name}` }] : [];
  });
  if (chosen.length === 0) return null;

  return (
    <ul className="mt-[5px] flex flex-col gap-px text-caption leading-[18px] text-ink/50">
      {chosen.map((row) => (
        <li key={row.id} className="truncate">
          {row.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * One bag item (Figma 1:2782 / 1:2755 / 1:2734): checkbox, shoe cut-out with a
 * soft shadow, "Qty" + pill stepper underneath; details column 186px in with
 * an optional "Customised" label (with an Edit link to the customiser), name,
 * category, size, MRP, tax note and, for a customised item, the parts and
 * colours chosen for it.
 */
export function BagItemRow({
  item,
  product,
  onQuantityChange,
  onSelectedChange,
  onRemoveRequest,
  designProblem = null,
  className,
}: {
  item: CartItem;
  product: BagProduct;
  /**
   * Why its design can't be ordered: the shoe isn't customisable now
   * ("unavailable"), or a part or colour no longer exists ("stale").
   */
  designProblem?: "unavailable" | "stale" | null;
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
              max={MAX_CART_QUANTITY}
              onChange={onQuantityChange}
              onRemoveRequest={onRemoveRequest}
            />
          </div>
        </div>
        {/* Why "+" has stopped. */}
        {item.quantity >= MAX_CART_QUANTITY && (
          <p className="mt-1 ml-[29px] text-caption text-ink/50">Maximum {MAX_CART_QUANTITY}</p>
        )}
      </div>

      <div className={cn("min-w-0", !customised && "pt-[43px]")}>
        {customised && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body font-medium">
            Customised
            <Image
              src="/images/icons/customise.png"
              alt=""
              width={24}
              height={22}
              className="h-[22px] w-6 object-cover"
            />
            {/* Only when the customiser page exists and the shoe is still customisable; otherwise
                the label stays, with no link to a 404 or a customiser that won't open. */}
            {hasCustomizerPage(product.slug) && designProblem !== "unavailable" && (
              <Link
                href={`/products/${product.slug}/customise?item=${encodeURIComponent(item.id)}`}
                aria-label={`Edit the customisation of ${product.name}, size ${sizeLabel}`}
                className="text-secondary font-medium text-ink/70 underline decoration-from-font underline-offset-auto"
              >
                Edit
              </Link>
            )}
          </p>
        )}
        <h2 className={cn("truncate text-body font-medium", customised && "mt-[25px]")}>
          {product.name}
        </h2>
        {designProblem && (
          <p role="alert" className="mt-1 text-[15px] text-danger [overflow-wrap:anywhere]">
            {designProblem === "unavailable" ? CUSTOMISATION_UNAVAILABLE_MESSAGE : STALE_DESIGN_MESSAGE}
          </p>
        )}
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
        {customised && item.customization && (
          <CustomizationDetails productId={item.productId} selection={item.customization} />
        )}
      </div>
    </li>
  );
}
