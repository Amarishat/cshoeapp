import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { SizeChartView } from "@/components/product/SizeChartView";
import { PRODUCT_PAGES } from "@/lib/data/productPages";

export const dynamicParams = false;

// Same routes as the product page (V1: Sabrina 2 EP); any other slug is a 404.
export async function generateStaticParams() {
  return PRODUCT_PAGES.map((page) => ({ slug: page.slug }));
}

export const metadata: Metadata = { title: "Size chart" };

// Copy from Figma (1:2617–1:2622), with its stray double spaces removed.
const steps = [
  "Tape a piece of paper to a hard, flat surface, ensuring the paper doesn't slip.",
  "Stand on the paper, feet shoulder width apart and weight evenly balanced (only one foot will be on the paper).",
  "With a pen or pencil pointed straight down, have a friend or partner assist you by marking the tip of the big toe and the outermost part of the heel.",
  "Once the marks are recorded, step off the paper and use a ruler or tape measure to measure the distance between the two points. This measurement represents the length of the foot.",
  "Repeat the process with the other foot. Please note that it is common for one foot to be a slightly different length to the other.",
  "Apply the longer of the two measurements to our size chart to find the right correlating size for the recorded foot length. If the measurement is between sizes, we recommend sizing up.",
];

/**
 * Size Chart — Figma frame 1:2606. The product's sizes are loaded from
 * Supabase by SizeChartView; the illustration and steps are static copy.
 */
export default async function SizeChartPage({ params }: PageProps<"/products/[slug]/size-chart">) {
  const { slug } = await params;
  if (!PRODUCT_PAGES.some((page) => page.slug === slug)) notFound();

  return (
    <div className="pb-10">
      <AppHeader leading="back" backHref={`/products/${slug}`} title="Size chart" />

      <div className="mt-[30px]">
        <SizeChartView slug={slug} />
      </div>

      {/* Foot illustration: 369×330 frame with Figma's crop of the 500px image. */}
      <div className="relative mx-auto mt-10 aspect-[369/330] w-[85.8%] overflow-hidden">
        <div className="absolute top-[-14.24%] left-[-8.54%] h-[130.91%] w-[117.07%]">
          <Image
            src="/images/size-chart/foot-measure.png"
            alt="Foot on paper with its length measured from heel to big toe"
            fill
            sizes="(max-width: 430px) 100vw, 430px"
          />
        </div>
      </div>

      <section aria-labelledby="measure-heading" className="mt-10 px-gutter">
        <h2 id="measure-heading" className="text-body leading-[31px] font-medium">
          How to measure foot length
        </h2>
        <ol className="mt-6 flex flex-col gap-10">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-4 leading-[31px] font-medium">
              <span aria-hidden className="w-6 shrink-0 text-body">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="max-w-[334px] text-label text-ink/70">{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
