import type { Metadata } from "next";
import { AddressView } from "@/components/checkout/AddressView";
import { AppHeader } from "@/components/layout/AppHeader";
import { getBagCatalog } from "@/lib/data/bagCatalog";
import { locations } from "@/lib/data/locations";

export const metadata: Metadata = { title: "Address" };

/** Checkout · Address — Figma frame 1:3396. */
export default async function AddressPage() {
  const catalog = await getBagCatalog();

  return (
    <>
      <AppHeader leading="back" backHref="/bag" title="Address" />
      <AddressView catalog={catalog} locations={locations} />
    </>
  );
}
