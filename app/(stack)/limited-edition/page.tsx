import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { LimitedEditionView } from "@/components/limited/LimitedEditionView";
import { getLimitedEdition } from "@/lib/data/limitedEdition";

export const metadata: Metadata = { title: "Limited Edition" };

/** Limited Edition — Figma frame 1:2893 (stack screen; back is normal history back). */
export default async function LimitedEditionPage() {
  const edition = await getLimitedEdition();
  if (!edition) notFound();

  return (
    <>
      <AppHeader leading="back" backHref="/" title="Limited Edition" actions={<BagButton />} />
      <LimitedEditionView edition={edition} />
    </>
  );
}
