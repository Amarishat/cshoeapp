"use client";

import Image from "next/image";
import type { UpiAppOption } from "@/lib/data/paymentMethods";
import type { UpiAppId } from "@/lib/types";

/**
 * UPI app card (Figma 1:4915): 386px white card, #CCC outline, 15px radius.
 * Each app: 43px logo tile, Medium 17 name, green tick when selected / grey
 * circle when not. The selected app shows its blue "Pay using …" button.
 */
export function UpiApps({
  apps,
  selected,
  onSelect,
  onPay,
  disabled,
}: {
  apps: UpiAppOption[];
  selected: UpiAppId;
  onSelect: (id: UpiAppId) => void;
  onPay: () => void;
  disabled: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="UPI app" className="mx-0.5 rounded-[15px] border border-border bg-white">
      {apps.map((app, index) => {
        const isSelected = app.id === selected;
        return (
          <div key={app.id} className={index > 0 ? "border-t border-border/70" : undefined}>
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(app.id)}
              className="flex w-full items-center px-[17px] py-4 text-left"
            >
              <span className="flex size-[43px] shrink-0 items-center justify-center rounded-[4px] border-[0.5px] border-[#cac7c7]">
                <Image
                  src={app.logo}
                  alt=""
                  width={Math.ceil(app.logoWidth * 2)}
                  height={Math.ceil(app.logoHeight * 2)}
                  style={{ width: app.logoWidth, height: app.logoHeight }}
                  className="object-contain"
                />
              </span>
              <span className="ml-[14px] flex-1 text-[17px] font-medium tracking-[-0.26px]">{app.name}</span>
              <Image
                src={isSelected ? "/images/payment/selected.svg" : "/images/payment/unselected.svg"}
                alt=""
                width={21}
                height={21}
                unoptimized
                className="size-[21.28px]"
              />
            </button>
            {isSelected && (
              <div className="pr-[17px] pb-[18px] pl-[69px]">
                <button
                  type="button"
                  onClick={onPay}
                  disabled={disabled}
                  className="h-[45px] w-full max-w-[271px] rounded-[11px] bg-[#4b81f4] text-[17px] font-medium text-white disabled:opacity-60"
                >
                  Pay using {app.name}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
