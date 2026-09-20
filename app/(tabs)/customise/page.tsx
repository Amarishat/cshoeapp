import type { Metadata } from "next";
import { CustomiseHubView } from "@/components/customise/CustomiseHubView";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Customise" };

/**
 * Customise Hub — Figma frame 1:3101 (bottom-nav tab, no back arrow). The
 * brands and customisable shoes are loaded from Supabase by CustomiseHubView.
 */
export default function CustomiseHubPage() {
  return (
    <>
      <AppHeader
        title="Customise"
        actions={
          <>
            <span className="flex items-center gap-2">
              <ComingSoonBadge />
              <span role="img" aria-label="Search (coming soon)" className="flex">
                <Icon name="search" className="size-[30px] text-ink/40" />
              </span>
            </span>
            <BagButton />
          </>
        }
      />
      <CustomiseHubView />
    </>
  );
}
