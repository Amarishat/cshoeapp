import type { Metadata } from "next";
import { BagView } from "@/components/bag/BagView";
import { AppHeader } from "@/components/layout/AppHeader";

export const metadata: Metadata = { title: "Bag" };

/** Bag — Figma frame 1:2713. Product info is loaded from Supabase by BagView. */
export default function BagPage() {
  return (
    <>
      <AppHeader leading="back" title="Bag" />
      <BagView />
    </>
  );
}
