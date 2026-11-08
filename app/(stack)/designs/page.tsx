import type { Metadata } from "next";
import { DesignsView } from "@/components/designs/DesignsView";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";

export const metadata: Metadata = { title: "My Designs" };

/**
 * My Designs (side menu → Saved): the guest's saved customiser designs,
 * loaded from Supabase by DesignsView.
 */
export default function DesignsPage() {
  return (
    <>
      <AppHeader leading="back" title="My Designs" actions={<BagButton />} />
      <DesignsView />
    </>
  );
}
