import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { CardImage as CardImageData, ListImage, Rect } from "@/lib/types";

const CARD_W = 187;
const CARD_H = 198;

function pct(rect: Rect, w = 100, h = 100): CSSProperties {
  const [left, top, width, height] = rect;
  return {
    left: `${(left / w) * 100}%`,
    top: `${(top / h) * 100}%`,
    width: `${(width / w) * 100}%`,
    height: `${(height / h) * 100}%`,
  };
}

/**
 * Places a product cut-out inside the 187×198 card exactly as in Figma, using
 * percentages so the card can scale with the column.
 */
export function CardImage({ image, alt }: { image: CardImageData; alt: string }) {
  const style: CSSProperties = {
    ...pct(image.box, CARD_W, CARD_H),
    filter: image.shadow ? `drop-shadow(0 15px 30px rgba(0,0,0,${image.shadow}))` : undefined,
  };

  return (
    <div className={cn("absolute", image.flip && "-scale-x-100")} style={style}>
      {image.crop ? (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute" style={pct(image.crop)}>
            <Image src={image.src} alt={alt} fill sizes="200px" />
          </div>
        </div>
      ) : (
        <Image src={image.src} alt={alt} fill sizes="190px" className="object-cover" />
      )}
    </div>
  );
}

/**
 * A product image scaled to fit any tile (e.g. Wishlist's 170×120): the shoe
 * frame keeps its aspect ratio and is centred in the parent, which must be
 * positioned and sized. Uses the same crop data as `CardImage`.
 */
export function FittedCardImage({
  image,
  alt,
  shadow,
  sizes = "170px",
}: {
  image: ListImage;
  alt: string;
  /** CSS drop-shadow, e.g. Figma's "0 3px 2px rgba(0,0,0,0.25)". */
  shadow?: string;
  sizes?: string;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center [container-type:size]">
      <div
        className={cn("relative", image.flip && "-scale-x-100")}
        style={{
          width: `min(100cqw, ${image.aspect * 100}cqh)`,
          aspectRatio: image.aspect,
          filter: shadow ? `drop-shadow(${shadow})` : undefined,
        }}
      >
        {image.crop ? (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute" style={pct(image.crop)}>
              <Image src={image.src} alt={alt} fill sizes={sizes} />
            </div>
          </div>
        ) : (
          <Image src={image.src} alt={alt} fill sizes={sizes} className="object-cover" />
        )}
      </div>
    </div>
  );
}
