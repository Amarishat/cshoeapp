"use client";

import Image from "next/image";
import { Icon } from "./Icon";

function StepButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: "minus" | "plus";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      // 19px circle in Figma; the ::after widens the tap target.
      className="relative flex size-[19px] items-center justify-center rounded-full border border-border bg-white after:absolute after:-inset-3 after:content-['']"
    >
      <Icon name={icon} className="size-[17.4px]" />
    </button>
  );
}

/** 34px outlined circle button from the Customizer frame (Figma "Group 11" / "Group 12"). */
function CircleStepButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: "minus" | "plus";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="relative size-[34.25px] shrink-0 after:absolute after:-inset-1.5 after:content-['']"
    >
      {icon === "minus" ? (
        <Image src="/images/customizer/qty-minus.svg" alt="" fill unoptimized />
      ) : (
        <>
          <Image src="/images/customizer/qty-circle.svg" alt="" fill unoptimized />
          <Image
            src="/images/customizer/qty-plus.svg"
            alt=""
            width={26}
            height={26}
            unoptimized
            className="absolute top-[4.28px] left-[4.28px] size-[25.68px]"
          />
        </>
      )}
    </button>
  );
}

/**
 * Quantity control.
 * - `pill` (Product, Figma 1:2581): 86×31 #F5F5F5 pill with 19px −/+ circles.
 * - `circles` (Customizer, Figma 1:6655): separate 34px outlined circles.
 * The count is Inter Medium 19 in both.
 */
export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  variant = "pill",
  onRemoveRequest,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  variant?: "pill" | "circles";
  /** If set, "−" at the minimum stays enabled and asks to remove the item (Bag). */
  onRemoveRequest?: () => void;
}) {
  const Step = variant === "pill" ? StepButton : CircleStepButton;
  const atMin = value <= min;
  const canRemove = atMin && onRemoveRequest !== undefined;

  return (
    <div
      className={
        variant === "pill"
          ? "flex h-[31px] w-[86px] items-center justify-between rounded-[24px] bg-surface pr-[7px] pl-2"
          : "flex items-center gap-3"
      }
    >
      <Step
        label={canRemove ? "Remove item" : "Decrease quantity"}
        icon="minus"
        disabled={atMin && !canRemove}
        onClick={() => (canRemove ? onRemoveRequest?.() : onChange(Math.max(min, value - 1)))}
      />
      <output
        aria-live="polite"
        aria-label={`Quantity ${value}`}
        className={variant === "circles" ? "min-w-3 text-center text-body font-medium" : "text-body font-medium"}
      >
        {value}
      </output>
      <Step
        label="Increase quantity"
        icon="plus"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      />
    </div>
  );
}
