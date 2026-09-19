"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { Icon } from "@/components/ui/Icon";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/pricing";
import { sizeLabel, type SizeSystem } from "@/lib/sizes";
import { useBagStore } from "@/lib/store/bag";
import type { ProductDetail } from "@/lib/types";
import { HeartButton } from "./HeartButton";
import { GallerySlideImage, ProductGallery } from "./ProductGallery";
import { SizeSelector } from "./SizeSelector";
import { TryOnButton } from "./TryOnButton";

function Stars({ count, className }: { count: number; className?: string }) {
  // Figma overlaps the 22px stars by 5px (17px apart).
  return (
    <span aria-hidden className={cn("flex", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Icon key={i} name="star" className={cn("size-[22px] text-[#ffc107]", i > 0 && "-ml-[5px]")} />
      ))}
    </span>
  );
}

const customisePillClass =
  "absolute top-[22px] left-1/2 flex h-[49px] w-[152px] -translate-x-1/2 items-center gap-2 rounded-[24.5px] bg-white pl-[19px] text-label font-medium";

const customiseIcon = (
  <Image
    src="/images/icons/customise.png"
    alt=""
    width={19}
    height={23}
    className="h-[23px] w-[19px] object-cover"
  />
);

function Divider() {
  // 370px wide, centred: 30px in from the screen edges.
  return <hr className="mx-[10px] my-6 border-border" />;
}

/**
 * Product screen body — Figma frame 1:2478. `customisable` is true only when
 * the product has a V1 customiser; otherwise the Customise pill is shown as
 * Coming Soon and doesn't link (so there's no 404 or prefetch).
 */
export function ProductView({
  product,
  customisable = false,
}: {
  product: ProductDetail;
  customisable?: boolean;
}) {
  const router = useRouter();
  const addToBag = useBagStore((s) => s.add);

  const [imageIndex, setImageIndex] = useState(0);
  const [system, setSystem] = useState<SizeSystem>("uk");
  const [sizeUK, setSizeUK] = useState(product.defaultSizeUK);
  const [quantity, setQuantity] = useState(1);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [open, setOpen] = useState({ fit: true, reviews: false, info: false });
  const [justAdded, setJustAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const addedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  const onGallerySelect = useCallback((index: number) => setImageIndex(index), []);

  const base = `/products/${product.slug}`;
  const reviewCount = product.reviews.length;
  const thumbnails = product.gallery.slice(1);

  /** Saves to the Bag (Supabase); true once saved. A failure is shown below the buttons. */
  async function add(): Promise<boolean> {
    if (adding) return false;
    setAdding(true);
    setAddError("");
    const error = await addToBag({ id: "", productId: product.id, size: `UK ${sizeUK}`, quantity });
    setAdding(false);
    if (error) setAddError(error);
    return !error;
  }

  async function onAddToBag() {
    if (!(await add())) return;
    setJustAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 2000);
  }

  async function onBuyNow() {
    if (await add()) router.push("/checkout/address");
  }

  function showReviews() {
    setOpen((o) => ({ ...o, reviews: true }));
    requestAnimationFrame(() =>
      document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  return (
    <div className="pb-[107px]">
      {/* Gallery with Customise pill and wishlist heart */}
      <div className="mt-8 px-gutter">
        <ProductGallery
          images={product.gallery}
          selected={imageIndex}
          onSelect={onGallerySelect}
          overlay={
            <>
              {customisable ? (
                <Link href={`${base}/customise`} className={customisePillClass}>
                  {customiseIcon}
                  Customise
                </Link>
              ) : (
                <div aria-disabled="true" className={customisePillClass}>
                  <span className="flex items-center gap-2 opacity-40">
                    {customiseIcon}
                    Customise
                  </span>
                  <ComingSoonBadge className="absolute -top-2.5 right-2" />
                </div>
              )}
              <HeartButton
                productId={product.id}
                productName={product.name}
                variant="image"
                className="absolute top-[27px] right-[41px]"
              />
            </>
          }
        />
      </div>

      {/* Virtual Try-On */}
      <div className="mt-6 flex justify-center">
        <TryOnButton />
      </div>

      {/* Thumbnails */}
      <ul
        aria-label="More images"
        className="no-scrollbar mt-6 flex snap-x snap-mandatory scroll-px-gutter gap-2 overflow-x-auto px-gutter"
      >
        {thumbnails.map((image, i) => (
          <li key={image.src} className="shrink-0 snap-start">
            <button
              type="button"
              aria-label={`Show ${image.alt}`}
              aria-current={imageIndex === i + 1 ? "true" : undefined}
              onClick={() => setImageIndex(i + 1)}
              className="relative block h-[163px] w-[158px] bg-surface"
            >
              <GallerySlideImage image={image} sizes="160px" />
            </button>
          </li>
        ))}
      </ul>

      {/* Name, price, rating, quantity */}
      <div className="mt-10 flex justify-between gap-4 px-gutter">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-body font-medium">{product.name}</h2>
          <p className="text-secondary text-muted/70">{product.category}</p>
          <p className="text-body">
            MRP : <span className="font-semibold">{formatPrice(product.price)}</span>
          </p>
          <p className="text-caption text-ink/40">
            Incl. of taxes
            <br />
            (Also includes all applicable duties)
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between">
          <div className="flex w-[94px] flex-col items-center gap-[2px]">
            <p className="flex items-start gap-[6px]">
              <Icon name="star" className="size-[27px] text-[#ffc107]" />
              <span className="mt-1 text-body font-medium">
                <span className="sr-only">Rated </span>
                {product.rating.toFixed(1)}
              </span>
            </p>
            <button type="button" onClick={showReviews} className="text-label whitespace-nowrap text-success">
              ({reviewCount} Reviews)
            </button>
          </div>
          <div className="flex items-center gap-5">
            <span id="qty-label" className="text-body font-medium">
              Qty
            </span>
            <div role="group" aria-labelledby="qty-label">
              <QtyStepper value={quantity} onChange={setQuantity} />
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="mt-[26px] px-gutter text-body leading-[29px]">
        {product.description.excerpt}
        {descriptionOpen ? (
          ` ${product.description.rest}`
        ) : (
          <>
            ...{" "}
            <button
              type="button"
              aria-expanded={false}
              onClick={() => setDescriptionOpen(true)}
              className="font-semibold"
            >
              see more
            </button>
          </>
        )}
      </p>

      {/* Size */}
      <div className="mt-10 flex items-center justify-between px-gutter text-body font-medium">
        <h2 id="size-heading">Size :</h2>
        <div role="group" aria-label="Size system" className="flex gap-5">
          {(
            [
              ["uk", "UK/India"],
              ["us", "US"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={system === value}
              onClick={() => setSystem(value)}
              className={system === value ? "text-ink" : "text-border"}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6">
        <SizeSelector
          ariaLabel={`Size (${system === "uk" ? "UK/India" : "US"})`}
          sizes={product.sizesUK}
          labelFor={(uk) => sizeLabel(uk, system)}
          value={sizeUK}
          onChange={setSizeUK}
        />
      </div>

      {/* Actions */}
      <div className="mt-[52px] flex flex-col gap-[21px] px-10">
        <Button size="lg" className="w-full" onClick={onAddToBag}>
          {justAdded ? "Added To Bag" : "Add To Bag"}
        </Button>
        <Button size="lg" variant="secondary" className="w-full" onClick={onBuyNow}>
          Buy Now
        </Button>
        <p aria-live="polite" className="sr-only">
          {justAdded ? `${product.name}, size UK ${sizeUK}, added to bag` : ""}
        </p>
        {addError && (
          <p role="alert" className="-mt-2 text-center text-secondary text-danger [overflow-wrap:anywhere]">
            {addError}
          </p>
        )}
      </div>

      {/* Accordions */}
      <div className="mt-10 px-gutter">
        <Accordion
          title="Size and Fit"
          open={open.fit}
          onOpenChange={(fit) => setOpen((o) => ({ ...o, fit }))}
        >
          <Link
            href={`${base}/size-chart`}
            className="text-secondary font-medium underline decoration-from-font underline-offset-auto"
          >
            Size Guide
          </Link>
        </Accordion>
        <Divider />

        <Accordion
          id="reviews"
          title={`Reviews (${reviewCount})`}
          trailing={<Stars count={Math.round(product.rating)} />}
          open={open.reviews}
          onOpenChange={(reviews) => setOpen((o) => ({ ...o, reviews }))}
        >
          <ul className="flex flex-col gap-4">
            {product.reviews.map((review) => (
              <li key={review.id} className="flex flex-col gap-1">
                <p className="flex items-center gap-2 text-secondary font-medium">
                  {review.author}
                  <Stars count={review.rating} className="scale-75 origin-left" />
                  <span className="sr-only">{review.rating} out of 5</span>
                </p>
                <p className="text-secondary text-ink/70">{review.text}</p>
              </li>
            ))}
          </ul>
        </Accordion>
        <Divider />

        <Accordion
          title="Product Information"
          open={open.info}
          onOpenChange={(info) => setOpen((o) => ({ ...o, info }))}
        >
          <dl className="flex flex-col gap-2 text-secondary">
            {product.details.map((detail) => (
              <div key={detail.label}>
                <dt className="inline font-medium">{detail.label}: </dt>
                <dd className="inline text-ink/70">{detail.value}</dd>
              </div>
            ))}
          </dl>
        </Accordion>
        <Divider />
      </div>
    </div>
  );
}
