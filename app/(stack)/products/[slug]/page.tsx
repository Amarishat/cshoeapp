import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { ProductView } from "@/components/product/ProductView";
import { ShareButton } from "@/components/product/ShareButton";
import { getCustomization } from "@/lib/data/customizations";
import { getProductDetail, getProductDetailSlugs } from "@/lib/data/productDetails";

// Only products with full detail data have a page for now.
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getProductDetailSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  return { title: product?.name };
}

/** Product — Figma frame 1:2478. */
export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product) notFound();
  // Only products with a V1 customiser get a working Customise link.
  const customisable = Boolean(await getCustomization(slug));

  return (
    <>
      <AppHeader
        leading="back"
        title={product.shortName}
        actions={
          <>
            <ShareButton title={product.name} />
            <BagButton />
          </>
        }
      />
      <ProductView product={product} customisable={customisable} />
    </>
  );
}
