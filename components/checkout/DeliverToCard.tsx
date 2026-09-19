import Link from "next/link";
import type { Address } from "@/lib/types";
import { addressLines, AddressTypeChip } from "./AddressCard";

/**
 * "Deliver to" card (Figma 1:3514): 389×174, 22px radius, outline and shadow
 * at 20%; name, type chip, address lines at 50%, and a "Change" button.
 */
export function DeliverToCard({ address }: { address: Address }) {
  return (
    <section
      aria-labelledby="deliver-to-heading"
      className="relative min-h-[174px] rounded-[22px] border border-ink/20 bg-page px-7 pt-[15px] pb-6 shadow-[0_4px_8px_rgba(0,0,0,0.05)]"
    >
      <h2 id="deliver-to-heading" className="text-[15px] font-medium">
        Deliver to:
      </h2>
      <Link
        href="/checkout/address"
        className="absolute top-[17px] right-[22px] flex h-[35px] w-20 items-center justify-center rounded-[3px] border border-border bg-white text-[15px] font-medium"
      >
        Change
        <span className="sr-only"> delivery address</span>
      </Link>
      <div className="mt-[17px] flex items-center gap-[18px]">
        <p className="truncate text-[17px] font-medium">{address.fullName}</p>
        <AddressTypeChip type={address.type} />
      </div>
      <address className="mt-3 flex flex-col gap-1 text-[15px] text-ink/50 not-italic">
        {addressLines(address).map((line) => (
          <span key={line}>{line}</span>
        ))}
      </address>
    </section>
  );
}
