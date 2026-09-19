import type { Metadata } from "next";
import { BagView } from "@/components/bag/BagView";
import { AppHeader } from "@/components/layout/AppHeader";
import { getBagCatalog } from "@/lib/data/bagCatalog";

export const metadata: Metadata = { title: "Bag" };

/** Bag — Figma frame 1:2713. */
export default async function BagPage() {
  const catalog = await getBagCatalog();

  return (
    <>
      <AppHeader leading="back" title="Bag" />
      <BagView catalog={catalog} />
    </>
  );
}
