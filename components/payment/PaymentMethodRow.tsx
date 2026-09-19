"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { PaymentMethodOption } from "@/lib/data/paymentMethods";
import type { PaymentMethodId } from "@/lib/types";

/** Leading icons from Figma 1:4858 (exported SVGs, iconoir cash, drawn UPI badge). */
function MethodIcon({ id }: { id: PaymentMethodId }) {
  switch (id) {
    case "card":
      return <Image src="/images/payment/card.svg" alt="" width={26} height={19} unoptimized className="h-[18.75px] w-[26.25px]" />;
    case "netbanking":
      return <Image src="/images/payment/bank.svg" alt="" width={28} height={23} unoptimized className="h-[22.5px] w-[28.1px]" />;
    case "wallets":
      return <Image src="/images/payment/wallet.svg" alt="" width={24} height={20} unoptimized className="h-5 w-[23.75px]" />;
    case "upi":
      return (
        <span className="flex h-[19px] w-6 items-center justify-center border-2 border-ink text-[11px] leading-none font-semibold">
          UPI
        </span>
      );
    case "cod":
      return <Icon name="handCash" className="size-[30px]" />;
  }
}

/**
 * Payment method row (Figma 1:4877 etc.): full-width, 32px vertical padding,
 * icon, SemiBold 15 name, Regular 12 subtitle at 70%, formkit chevron.
 * Unavailable methods are dimmed, marked "Coming Soon" and not interactive.
 */
export function PaymentMethodRow({
  method,
  open = false,
  onToggle,
  children,
}: {
  method: PaymentMethodOption;
  open?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
}) {
  const header = (
    <>
      <span className={cn("flex w-[41px] shrink-0 pt-px", !method.available && "opacity-40")}>
        <MethodIcon id={method.id} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("text-[15px] font-semibold", !method.available && "text-ink/40")}>
            {method.name}
          </span>
          {!method.available && (
            <ComingSoonBadge />
          )}
        </span>
        {method.subtitle && (
          <span className={cn("mt-px block text-caption", method.available ? "text-ink/70" : "text-ink/30")}>
            {method.subtitle}
          </span>
        )}
      </span>
      <Icon
        name={open ? "chevronUp" : "chevronDown"}
        className={cn("mt-1 size-5 shrink-0", !method.available && "opacity-20")}
      />
    </>
  );

  return (
    <li className="border-b border-border/70">
      {method.available ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex w-full items-start px-gutter py-8 text-left"
        >
          {header}
        </button>
      ) : (
        <div aria-disabled="true" className="flex items-start px-gutter py-8">
          {header}
        </div>
      )}
      {open && children && <div className="-mt-0 px-gutter pb-8">{children}</div>}
    </li>
  );
}
