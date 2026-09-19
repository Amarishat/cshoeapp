import type { Metadata } from "next";
import { AddressManager } from "@/components/checkout/AddressManager";
import { AppHeader } from "@/components/layout/AppHeader";
import { locations } from "@/lib/data/locations";

export const metadata: Metadata = { title: "Saved Addresses" };

/**
 * Settings · Saved Addresses. No Figma frame of its own: it reuses the
 * Address screen's list and form (1:3396) without the checkout stepper,
 * Continue bar or bag guard. Same address store as checkout.
 */
export default function SavedAddressesPage() {
  return (
    <>
      <AppHeader leading="back" backHref="/settings" title="Saved Addresses" />
      <hr className="mt-[15px] border-border/70" />
      <AddressManager locations={locations} className="mt-[30px] pb-10" />
    </>
  );
}
