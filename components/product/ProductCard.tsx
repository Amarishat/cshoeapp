import Image from "next/image";
import Link from "next/link";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/pricing";
import type { ProductCardData } from "@/lib/types";
import { CardImage } from "./CardImage";
import { HeartButton } from "./HeartButton";
import { Rating } from "./Rating";

/**
 * Product card (Figma Home): 187×198 #F5F5F5 tile with 20px radius, then name
 * (Medium 19, up to two lines), category (Regular 16, muted), "MRP : ₹…" (19,
 * scaled down to stay on one line in narrow cards) and rating.
 *
 * - `heart`: wishlist button overlapping the top-right corner.
 * - `customise`: white 37px badge with the customise icon, inside the tile;
 *   the card opens the customiser instead of the product page.
 * - `linkable={false}`: not a link (for products whose page isn't built).
 *   `comingSoon` then shows a Coming Soon badge in the tile's top-left corner
 *   (on by default for `customise` cards, off for `heart` cards).
 */
export function ProductCard({
  product,
  action = "heart",
  heartOffset = "grid",
  categoryOpacity = 30,
  linkable = true,
  comingSoon = action === "customise",
  className,
}: {
  product: ProductCardData;
  action?: "heart" | "customise";
  /** Figma nudges the heart further out on horizontal rails than in grids. */
  heartOffset?: "grid" | "rail";
  /** 30% in most sections, 50% in "Top Trending Customisation". */
  categoryOpacity?: 30 | 50;
  linkable?: boolean;
  /** Show Coming Soon when `linkable` is false. */
  comingSoon?: boolean;
  className?: string;
}) {
  const href =
    action === "customise" ? `/products/${product.slug}/customise` : `/products/${product.slug}`;

  const body = (
    <>
      <div className="relative aspect-[187/198] rounded-[20px] bg-surface">
        <CardImage image={product.image} alt={product.name} />
        {action === "customise" && (
          <span
            aria-hidden
            className="absolute top-[9px] right-2 flex size-[37px] items-center justify-center rounded-full bg-white"
          >
            <Image
              src="/images/icons/customise.png"
              alt=""
              width={20}
              height={24}
              className="h-6 w-[19.83px] object-cover"
            />
          </span>
        )}
        {!linkable && comingSoon && (
          // White pill so it stands out on the #F5F5F5 tile.
          <ComingSoonBadge className="absolute top-[19px] left-2.5 bg-white!" />
        )}
      </div>
      {/* A container so the price can size itself to this card's width. */}
      <div className="@container mt-[11px] flex flex-col gap-[2px] px-[15px]">
        {/* Up to two lines, always reserving two so cards in a row stay aligned. */}
        <h3 className="line-clamp-2 min-h-[2lh] text-body font-medium">{product.name}</h3>
        <p className={cn("truncate text-secondary", categoryOpacity === 50 ? "text-ink/50" : "text-ink/30")}>
          {product.category}
        </p>
        {/* One line: 19px while "MRP : ₹17,000" fits, a touch smaller in narrower grid cards. */}
        <p className="text-[length:min(19px,14.8cqi)] whitespace-nowrap">
          MRP : <span className="font-medium">{formatPrice(product.price)}</span>
        </p>
        <Rating value={product.rating} />
      </div>
    </>
  );

  return (
    <article className={cn("relative", className)}>
      {linkable ? (
        <Link href={href} className="block">
          {body}
        </Link>
      ) : (
        <div>{body}</div>
      )}
      {action === "heart" && (
        <HeartButton
          productId={product.id}
          productName={product.name}
          className={cn(
            "absolute",
            heartOffset === "rail" ? "-top-[14px] -right-2" : "-top-[15px] -right-[3px]",
          )}
        />
      )}
    </article>
  );
}
