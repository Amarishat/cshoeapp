"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { bannerUnit, u } from "@/components/home/banner";
import { cn } from "@/lib/cn";
import type { ViewerAngle, WordmarkPlacement } from "@/lib/types";

/** The design width/height of the viewer area in Figma 1:6606 (y 107–634). */
const DESIGN_W = 430;
const DESIGN_H = 528;

const CUSTOMIZER_WORDMARK: WordmarkPlacement = { x: 352.8, y: 184, size: 120 };

function AngleArt({ angle, priority }: { angle: ViewerAngle; priority?: boolean }) {
  const [left, top, width, height] = angle.frame;
  return (
    <div
      className="pointer-events-none absolute flex items-center justify-center"
      style={{ left: u(left), top: u(top), width: u(width), height: u(height) }}
    >
      <div
        className="relative shrink-0"
        style={{
          width: u(angle.size[0]),
          height: u(angle.size[1]),
          transform: `rotate(${angle.rotate}deg)`,
          filter: angle.shadow
            ? `drop-shadow(0 ${u(angle.shadow[0])} ${u(angle.shadow[1])} rgba(0,0,0,${angle.shadow[2]}))`
            : undefined,
        }}
      >
        <Image
          src={angle.src}
          alt={angle.alt}
          fill
          priority={priority}
          sizes="(max-width: 430px) 80vw, 340px"
          className="object-cover"
        />
      </div>
    </div>
  );
}

/**
 * Customiser shoe viewer (Figma 1:6606, y 107–634): faded brand wordmark,
 * the shoe, a dashed orbit with the 360 handle and "360° view".
 *
 * Image-based for V1. With two or more `angles` the shoe area swipes between
 * them and the handle arrows / dots act as the angle indicator; with one angle
 * (Nike Air Force) the 360 control is static. A real 3D viewer can replace
 * this component behind the same props later.
 *
 * `children` are overlaid in the same coordinate space (use `u()`).
 * `wordmarkPlacement` and `show360` let other screens (e.g. Limited Edition,
 * which has a bigger wordmark and no 360 control) reuse the same viewer.
 */
export function ShoeViewer({
  angles,
  wordmark,
  wordmarkPlacement = CUSTOMIZER_WORDMARK,
  show360 = true,
  children,
}: {
  angles: ViewerAngle[];
  wordmark: string;
  wordmarkPlacement?: WordmarkPlacement;
  show360?: boolean;
  children?: ReactNode;
}) {
  const multi = angles.length > 1;
  const [emblaRef, emblaApi] = useEmblaCarousel({ active: multi });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <div className="@container">
      <div
        className="relative overflow-x-clip bg-white"
        style={{ ...bannerUnit(DESIGN_W), height: u(DESIGN_H) }}
      >
        {/* Faded, rotated brand wordmark (Inter Black Italic, 10% black). */}
        <p
          aria-hidden
          className="absolute font-black whitespace-nowrap text-black/10 italic"
          style={{
            left: u(wordmarkPlacement.x),
            top: u(wordmarkPlacement.y),
            fontSize: u(wordmarkPlacement.size),
            transform: "translate(-50%, -50%) rotate(90.13deg)",
          }}
        >
          {wordmark}
        </p>

        {multi ? (
          <section
            aria-roledescription="carousel"
            aria-label="Shoe angles"
            ref={emblaRef}
            className="absolute inset-x-0 top-0 overflow-hidden"
            style={{ height: u(360) }}
          >
            <div className="flex h-full">
              {angles.map((angle, index) => (
                <div
                  key={angle.src}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Angle ${index + 1} of ${angles.length}`}
                  className="relative h-full min-w-0 shrink-0 grow-0 basis-full"
                >
                  <AngleArt angle={angle} priority={index === 0} />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <AngleArt angle={angles[0]} priority />
        )}

        {show360 && (
          <>
            {/* Dashed orbit and 360 handle */}
            <div
              aria-hidden
              className="absolute"
              style={{ left: u(52), top: u(354), width: u(332), height: u(73) }}
            >
              <Image src="/images/customizer/orbit.png" alt="" fill sizes="340px" />
            </div>
            <div
              className="absolute flex items-center justify-center rounded-full bg-gray-4"
              style={{ left: u(209), top: u(412), width: u(30), height: u(30) }}
            >
              {(["left", "right"] as const).map((dir) => {
                const icon = (
                  <Image
                    src={`/images/customizer/arrow-${dir}.svg`}
                    alt=""
                    width={14}
                    height={14}
                    unoptimized
                    style={{ width: u(14), height: u(14) }}
                  />
                );
                return multi ? (
                  <button
                    key={dir}
                    type="button"
                    aria-label={dir === "left" ? "Previous angle" : "Next angle"}
                    onClick={() => (dir === "left" ? emblaApi?.scrollPrev() : emblaApi?.scrollNext())}
                    className="flex"
                  >
                    {icon}
                  </button>
                ) : (
                  <span key={dir} aria-hidden className="flex">
                    {icon}
                  </span>
                );
              })}
            </div>
            <p
              className="absolute -translate-x-1/2 text-label whitespace-nowrap text-[#555]"
              style={{ left: u(219), top: u(449) }}
            >
              360° view
              {!multi && <span className="sr-only"> (not available yet)</span>}
              {multi && (
                <span className="sr-only">
                  , angle {selected + 1} of {angles.length}
                </span>
              )}
            </p>
            {multi && (
              <div
                aria-hidden
                className="absolute flex -translate-x-1/2 gap-1.5"
                style={{ left: u(224), top: u(475) }}
              >
                {angles.map((angle, index) => (
                  <span
                    key={angle.src}
                    className={cn("size-1.5 rounded-full", index === selected ? "bg-[#555]" : "bg-gray-5")}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {children}
      </div>
    </div>
  );
}
