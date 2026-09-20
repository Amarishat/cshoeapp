import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomizerView } from "@/components/customizer/CustomizerView";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { ShareButton } from "@/components/product/ShareButton";
import { getCustomization, getCustomizationSlugs } from "@/lib/data/customizations";

// V1: only products with a customisation config (Nike Air Force) have a customiser.
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getCustomizationSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]/customise">): Promise<Metadata> {
  const { slug } = await params;
  const config = await getCustomization(slug);
  return { title: config ? `Customise ${config.title}` : undefined };
}

/**
 * Customizer — Figma frame 1:6606. With `?item=<cart item id>` (from the
 * Bag's Edit link) it edits that Bag item's design instead of adding a new one.
 */
export default async function CustomisePage({
  params,
  searchParams,
}: PageProps<"/products/[slug]/customise">) {
  const { slug } = await params;
  const { item } = await searchParams;
  const config = await getCustomization(slug);
  if (!config) notFound();

  return (
    <>
      {/* Back: history when there is one, otherwise the Customise Hub (Figma 1:6608 → 1:3101). */}
      <AppHeader
        leading="back"
        backHref="/customise"
        title={config.title}
        titleClassName="font-medium"
        actions={
          <>
            <ShareButton title={config.title} icon="shareOcticon" />
            <BagButton />
          </>
        }
      />
      {/* Figma 1:6686: full-width #CCC line at 70% under the header. */}
      <hr className="mt-[11px] border-border/70" />
      <CustomizerView config={config} cartItemId={typeof item === "string" ? item : null} />
    </>
  );
}
