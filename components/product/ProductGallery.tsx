"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { GalleryImage } from "@/lib/types";

// Figma thumbnail tile that cut-out `box` values are measured in.
const TILE_W = 158;
const TILE_H = 163;

export function GallerySlideImage({
  image,
  sizes,
  priority = false,
}: {
  image: GalleryImage;
  sizes: string;
  priority?: boolean;
}) {
  if (image.kind === "photo" || !image.box) {
    return (
      <Image src={image.src} alt={image.alt} fill sizes={sizes} priority={priority} className="object-cover" />
    );
  }
  const [left, top, width, height] = image.box;
  return (
    <div className="absolute inset-0 bg-surface">
      <div
        className="absolute"
        style={{
          left: `${(left / TILE_W) * 100}%`,
          top: `${(top / TILE_H) * 100}%`,
          width: `${(width / TILE_W) * 100}%`,
          height: `${(height / TILE_H) * 100}%`,
        }}
      >
        <Image src={image.src} alt={image.alt} fill sizes={sizes} className="object-cover" />
      </div>
    </div>
  );
}

/**
 * Product image gallery (Figma "Frame 249", 390×400): swipeable slides, dots
 * 89% down (9px, #3E3E3E active / #D9D9D9), and overlay controls on top.
 */
export function ProductGallery({
  images,
  selected,
  onSelect,
  overlay,
}: {
  images: GalleryImage[];
  selected: number;
  onSelect: (index: number) => void;
  overlay?: ReactNode;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel();

  // Report swipes back to the parent.
  useEffect(() => {
    if (!emblaApi) return;
    const handleSelect = () => onSelect(emblaApi.selectedScrollSnap());
    emblaApi.on("select", handleSelect);
    return () => {
      emblaApi.off("select", handleSelect);
    };
  }, [emblaApi, onSelect]);

  // Follow selections made elsewhere (dots, thumbnails).
  useEffect(() => {
    if (emblaApi && emblaApi.selectedScrollSnap() !== selected) emblaApi.scrollTo(selected);
  }, [emblaApi, selected]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Product images"
      className="relative aspect-[390/400]"
    >
      <div ref={emblaRef} className="absolute inset-x-0 top-0 h-[98.75%] overflow-hidden">
        <div className="flex h-full">
          {images.map((image, index) => (
            <div
              key={image.src}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${images.length}`}
              className="relative h-full min-w-0 shrink-0 grow-0 basis-full"
            >
              <GallerySlideImage
                image={image}
                sizes="(max-width: 430px) 100vw, 390px"
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 top-[89%] flex justify-center gap-[7px]">
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            aria-label={`Show image ${index + 1}`}
            aria-current={index === selected ? "true" : undefined}
            onClick={() => onSelect(index)}
            className={cn(
              "relative size-[9px] rounded-full after:absolute after:-inset-2 after:content-['']",
              index === selected ? "bg-[#3e3e3e]" : "bg-[#d9d9d9]",
            )}
          />
        ))}
      </div>

      {overlay}
    </section>
  );
}
