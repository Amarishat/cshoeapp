"use client";

import useEmblaCarousel from "embla-carousel-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { bannerUnit, RotatedShoe, u } from "./banner";

/**
 * Home promo carousel (Figma "Component 5", 1:1651): three 391×173 slides.
 * Headline in Jost (for Futura Md BT); Work Sans text set in Inter.
 */

function ShopNowPill({ label }: { label: string }) {
  return (
    <Link
      href="/shop"
      className="absolute flex items-center justify-center rounded-full bg-black font-semibold whitespace-nowrap text-white"
      style={{ left: u(36), top: u(122), width: u(101), height: u(32), fontSize: u(15) }}
    >
      {label}
    </Link>
  );
}

function SlideCard({ background, children }: { background: string; children: React.ReactNode }) {
  return (
    <div className="relative h-full overflow-hidden">
      <div
        className="absolute inset-0 border border-border"
        style={{ background, borderRadius: u(18) }}
      />
      {children}
    </div>
  );
}

function UnlockSlide() {
  return (
    <SlideCard background="#f5f5f5">
      <p
        className="absolute font-banner text-black"
        style={{ left: u(30), top: u(23), fontSize: u(26), lineHeight: u(30) }}
      >
        Unlock <span className="text-accent">20% Off</span>
        <br />
        on All Brands
      </p>
      <p
        className="absolute font-semibold whitespace-nowrap text-[#202727]"
        style={{ left: u(30), top: u(93), fontSize: u(15) }}
      >
        Customize Your Favorites!
      </p>
      <ShopNowPill label="Shop Now" />
      <RotatedShoe
        src="/images/banners/blue-shoe.png"
        frame={[197.4, 11, 182.2, 145]}
        size={[160.1, 88.7]}
        rotate={-23.4}
        shadow={[20, 40, 0.3]}
        doubled
        priority
      />
    </SlideCard>
  );
}

function DiscountSlide({ variant }: { variant: "green" | "promo" }) {
  return (
    <SlideCard background="#efefef">
      <p
        className="absolute font-semibold whitespace-nowrap text-[#202727]"
        style={{ left: u(35), top: u(38) }}
      >
        <span className="text-accent" style={{ fontSize: u(30) }}>
          20%
        </span>
        <span style={{ fontSize: u(28) }}> </span>
        <span style={{ fontSize: u(20) }}>Discount</span>
      </p>
      <p
        className="absolute whitespace-nowrap text-[#202727]"
        style={{ left: u(35), top: u(80), fontSize: u(14) }}
      >
        on your first purchase
      </p>
      <ShopNowPill label="Shop now" />
      {variant === "green" ? (
        <RotatedShoe
          src="/images/banners/green-shoe.png"
          frame={[196, 9, 174, 143.9]}
          size={[157.5, 75.2]}
          rotate={-30}
          shadow={[15.1, 30.2, 0.3]}
        />
      ) : (
        <RotatedShoe
          src="/images/banners/promo-shoe.png"
          frame={[156, -54, 293.7, 266.9]}
          size={[245.3, 205.5]}
          rotate={-16.55}
        />
      )}
    </SlideCard>
  );
}

const slides = [
  { key: "unlock", label: "Unlock 20% off on all brands", node: <UnlockSlide /> },
  { key: "discount-1", label: "20% discount on your first purchase", node: <DiscountSlide variant="green" /> },
  { key: "discount-2", label: "20% discount on your first purchase", node: <DiscountSlide variant="promo" /> },
];

export function PromoCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start" });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect).on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect);
    };
  }, [emblaApi]);

  return (
    <section aria-roledescription="carousel" aria-label="Offers" className="@container">
      <div className="relative aspect-[391/173]" style={bannerUnit(391)}>
        <div ref={emblaRef} className="h-full overflow-hidden">
          {/* 36px gap between slides, as in the Figma component. */}
          <div className="flex h-full" style={{ marginLeft: u(-36) }}>
            {slides.map((slide, index) => (
              <div
                key={slide.key}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${slides.length}: ${slide.label}`}
                className="h-full min-w-0 shrink-0 grow-0 basis-full"
                style={{ paddingLeft: u(36) }}
              >
                {slide.node}
              </div>
            ))}
          </div>
        </div>

        <div className="absolute" style={{ left: u(170), top: u(159), width: u(47), height: u(9) }}>
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              type="button"
              aria-label={`Show offer ${index + 1}`}
              aria-current={index === selected ? "true" : undefined}
              onClick={() => emblaApi?.scrollTo(index)}
              className={cn(
                "absolute rounded-full after:absolute after:-inset-2 after:content-['']",
                index === selected ? "bg-black" : "bg-[#d9d9d9]",
              )}
              style={{ left: u(index * 19), top: 0, width: u(9), height: u(9) }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
