"use client";

import Image from "next/image";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { Address, AddressType } from "@/lib/types";

export const typeChip: Record<AddressType, { label: string; icon: IconName }> = {
  home: { label: "Home", icon: "homeRound" },
  office: { label: "Office", icon: "workRound" },
  other: { label: "Other", icon: "locationRound" },
};

/** Grey address-type chip (Figma 1:3471 / 1:3518): 83×28, home icon + label. */
export function AddressTypeChip({ type }: { type: AddressType }) {
  const chip = typeChip[type];
  return (
    <span className="flex h-7 w-[83px] shrink-0 items-center gap-[5px] rounded-[1px] bg-surface pl-[5px] text-[15px]">
      <Icon name={chip.icon} className="size-5" />
      {chip.label}
    </span>
  );
}

/** Figma card lines: "ABC, Bangalore, Karnataka" / "Chinnaswamy Stadium -778788" / phone. */
export function addressLines(a: Address): string[] {
  return [`${a.street}, ${a.city}, ${a.state}`, `${a.area} -${a.pincode}`, a.phone];
}

/**
 * Saved address card (Figma 1:3462): 390×167, 20px radius, black outline and
 * shadow at 20%. Selected = black circle with white tick; unselected = #CCC
 * outlined circle. Tapping the card selects it; the pencil edits it.
 */
export function AddressCard({
  address,
  selected,
  onSelect,
  onEdit,
}: {
  address: Address;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const chip = typeChip[address.type];
  const lines = addressLines(address);

  return (
    <div className="relative min-h-[167px] rounded-[20px] border border-ink/20 bg-page pt-[21px] pr-[31px] pb-[43px] pl-8 shadow-[0_4px_8px_rgba(0,0,0,0.05)]">
      {/* Whole-card selection target, under the edit button */}
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={`Deliver to ${address.fullName}, ${chip.label}: ${lines.join(", ")}`}
        onClick={onSelect}
        className="absolute inset-0 rounded-[20px]"
      />
      <div className="pointer-events-none relative grid grid-cols-[25px_1fr] gap-x-[26px]">
        <span
          aria-hidden
          className={cn(
            "flex size-[25px] items-center justify-center rounded-full",
            selected ? "bg-ink" : "border-[1.5px] border-border",
          )}
        >
          {selected && (
            <Image src="/images/checkout/tick.svg" alt="" width={22} height={22} unoptimized />
          )}
        </span>
        <div className="@container min-w-0">
          <div className="flex items-center">
            <p className="min-w-0 flex-1 truncate pt-0.5 text-[17px] font-medium">
              {address.fullName}
            </p>
            <AddressTypeChip type={address.type} />
            <button
              type="button"
              aria-label={`Edit address for ${address.fullName}`}
              onClick={onEdit}
              // Figma's 51px gap at 430px; tighter on narrow phones so the name fits.
              className="pointer-events-auto relative ml-3 flex after:absolute after:-inset-3 after:content-[''] @[270px]:ml-[51px]"
            >
              <Icon name="edit" className="size-[21px]" />
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-1.5 text-[15px] leading-[15px] text-ink/70">
            {lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
