import type { Metadata } from "next";
import { AddressView } from "@/components/checkout/AddressView";
import { AppHeader } from "@/components/layout/AppHeader";

export const metadata: Metadata = { title: "Address" };

/** Checkout · Address — Figma frame 1:3396. Prices come from Supabase (AddressView). */
export default function AddressPage() {
  return (
    <>
      <AppHeader leading="back" backHref="/bag" title="Address" />
      <AddressView />
    </>
  );
}
