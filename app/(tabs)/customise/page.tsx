import type { Metadata } from "next";
import { CustomiseHubView } from "@/components/customise/CustomiseHubView";
import { BagButton } from "@/components/layout/BagButton";
import { SearchableHeader } from "@/components/layout/SearchableHeader";

export const metadata: Metadata = { title: "Customise" };

/**
 * Customise Hub — Figma frame 1:3101 (bottom-nav tab, no back arrow). The
 * brands and customisable shoes are loaded from Supabase by CustomiseHubView.
 */
export default function CustomiseHubPage() {
  return (
    <>
      <SearchableHeader leading="none" title="Customise" actions={<BagButton />} />
      <CustomiseHubView />
    </>
  );
}
