import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * Promo banners are laid out in Figma pixels and scaled with the container:
 * `u(px)` turns a Figma px value into a length relative to the banner width
 * (the element that sets `--u`, see `bannerUnit`).
 */
export const u = (px: number) => `calc(${px} * var(--u))`;

/** Style for a banner root designed at `designWidth` px; its parent must be `@container`. */
export const bannerUnit = (designWidth: number) =>
  ({ "--u": `calc(100cqw / ${designWidth})` }) as CSSProperties;

/**
 * A rotated shoe cut-out. `frame` is the Figma bounding box [left, top, width,
 * height]; the shoe (`size`) is centred in it and rotated like in Figma.
 */
export function RotatedShoe({
  src,
  frame,
  size,
  rotate,
  shadow,
  doubled = false,
  priority = false,
}: {
  src: string;
  frame: [number, number, number, number];
  size: [number, number];
  rotate: number;
  /** [offsetY, blur, opacity] of Figma's black drop shadow. */
  shadow?: [number, number, number];
  /** Figma stacks the same image twice for a denser result. */
  doubled?: boolean;
  priority?: boolean;
}) {
  const [left, top, width, height] = frame;
  const image = (
    <Image
      src={src}
      alt=""
      fill
      priority={priority}
      sizes="(max-width: 430px) 60vw, 260px"
      className="object-cover"
    />
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute flex items-center justify-center"
      style={{ left: u(left), top: u(top), width: u(width), height: u(height) }}
    >
      <div
        className="relative shrink-0"
        style={{
          width: u(size[0]),
          height: u(size[1]),
          transform: `rotate(${rotate}deg)`,
          filter: shadow
            ? `drop-shadow(0 ${u(shadow[0])} ${u(shadow[1])} rgba(0,0,0,${shadow[2]}))`
            : undefined,
        }}
      >
        {image}
        {doubled && image}
      </div>
    </div>
  );
}
