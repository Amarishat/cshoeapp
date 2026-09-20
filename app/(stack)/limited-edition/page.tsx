import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { LimitedEditionView } from "@/components/limited/LimitedEditionView";

export const metadata: Metadata = { title: "Limited Edition" };

/**
 * Limited Edition — Figma frame 1:2893 (stack screen; back is normal history
 * back). The featured product is loaded from Supabase by LimitedEditionView.
 */
export default function LimitedEditionPage() {
  return (
    <>
      <AppHeader leading="back" backHref="/" title="Limited Edition" actions={<BagButton />} />
      <LimitedEditionView />
    </>
  );
}
