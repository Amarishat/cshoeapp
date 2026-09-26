"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useWishlistStore } from "@/lib/store/wishlist";

// material-symbols-light:favorite, as exported from Figma.
const HEART_43 =
  "M27.625 11.0625C29.0885 11.0625 30.2943 11.5541 31.2764 12.5361C32.2584 13.5182 32.75 14.724 32.75 16.1875C32.75 16.8587 32.6422 17.5292 32.4228 18.2002L32.3213 18.4873C32.0368 19.2475 31.5274 20.1221 30.7725 21.1123C30.0183 22.1016 28.9852 23.2542 27.668 24.5723C26.3491 25.8911 24.6635 27.4807 22.6103 29.3408L21.999 29.8926L21.3877 29.3398C19.3517 27.4801 17.6696 25.8908 16.3418 24.5713C15.0173 23.2534 13.9812 22.0998 13.2275 21.1104C12.4726 20.1191 11.9622 19.2461 11.6777 18.4883C11.3903 17.7226 11.2493 16.9567 11.25 16.1885V16.1875C11.25 14.724 11.7416 13.5182 12.7236 12.5361C13.7057 11.5541 14.9115 11.0625 16.375 11.0625C17.3851 11.0625 18.3298 11.3195 19.2168 11.8379C20.1047 12.3568 20.8962 13.1187 21.5859 14.1406L22 14.7549L22.4141 14.1406C23.1038 13.1187 23.8953 12.3568 24.7832 11.8379C25.6702 11.3195 26.6149 11.0625 27.625 11.0625Z";
const HEART_30 =
  "M20.625 5.32321C22.0794 5.32321 23.2823 5.83929 24.2666 6.87985C25.2522 7.92181 25.75 9.20684 25.75 10.7695C25.75 11.5874 25.607 12.4038 25.3184 13.2197C25.0319 14.0287 24.5201 14.9562 23.7646 16.0039C23.0095 17.051 21.9757 18.2703 20.6582 19.664C19.6689 20.7099 18.4734 21.9166 17.0713 23.2842L15.6006 24.705L14.999 25.2793L14.3984 24.706H14.3994C12.872 23.2311 11.5439 21.9172 10.415 20.7636L9.35254 19.6631C8.02751 18.2693 6.99007 17.0494 6.23535 16.0019C5.47964 14.9531 4.96804 14.0262 4.68164 13.2197C4.39248 12.4053 4.24926 11.5898 4.25 10.7705V10.7695C4.25003 9.20684 4.74784 7.92181 5.7334 6.87985C6.71771 5.8393 7.9206 5.32321 9.375 5.32321C10.3794 5.32321 11.3202 5.59328 12.2061 6.1406C13.0933 6.6888 13.886 7.49523 14.5781 8.57907L15 9.23923L15.4219 8.57907C16.114 7.49523 16.9066 6.6888 17.7939 6.1406C18.6798 5.59328 19.6206 5.32321 20.625 5.32321Z";

/** How long the "couldn't update" message stays (as the Share button's feedback). */
const FEEDBACK_MS = 2500;

const FAILED = "Couldn’t update your wishlist. Try again.";

/**
 * Wishlist toggle — outlined heart when off, filled black when on (the filled
 * state appears on the Brand Nike frame).
 *
 * - `card` (Home "Group 126"): 43×41 white ellipse with a #CCC outline.
 * - `image` (Product gallery): 39px white circle, no outline, 30px heart.
 *
 * If the save fails, the heart stays as it was (it only changes once Supabase
 * has saved) and a short message appears under it, in the Share button's
 * feedback style. `className` positions the whole control, message included.
 */
export function HeartButton({
  productId,
  productName,
  variant = "card",
  className,
}: {
  productId: string;
  productName: string;
  variant?: "card" | "image";
  className?: string;
}) {
  const saved = useWishlistStore((s) => s.productIds.includes(productId));
  const toggle = useWishlistStore((s) => s.toggle);
  // One change at a time: the heart only fills once Supabase has saved it.
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heartFill = saved ? "black" : "white";

  useEffect(() => () => clearTimeout(timer.current), []);

  function onToggle() {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    clearTimeout(timer.current);
    void toggle(productId)
      .then((error) => {
        // null = saved; anything else is why it wasn't (the heart is unchanged).
        if (error === null) return;
        setFailed(true);
        timer.current = setTimeout(() => setFailed(false), FEEDBACK_MS);
      })
      .finally(() => setSaving(false));
  }

  // The caller's classes position the control (e.g. "absolute …" on a card);
  // otherwise it's the anchor for the message itself.
  const positioned = /(^|\s)(absolute|fixed|relative|sticky)(\s|$)/.test(className ?? "");

  return (
    <span className={cn(!positioned && "relative", className ?? "inline-flex")}>
      <button
        type="button"
        aria-pressed={saved}
        aria-label={saved ? `Remove ${productName} from wishlist` : `Add ${productName} to wishlist`}
        onClick={onToggle}
        className={cn("block", variant === "card" ? "h-[41px] w-[43px]" : "size-[39px]")}
      >
        {variant === "card" ? (
          <svg viewBox="0 0 43 41" width="43" height="41" aria-hidden className="block">
            <path
              d="M21.5 0.5C33.1207 0.5 42.5 9.47648 42.5 20.5C42.5 31.5235 33.1207 40.5 21.5 40.5C9.87931 40.5 0.5 31.5235 0.5 20.5C0.5 9.47648 9.87931 0.5 21.5 0.5Z"
              fill="white"
              stroke="#CCCCCC"
            />
            <path d={HEART_43} fill={heartFill} stroke="black" />
          </svg>
        ) : (
          <svg viewBox="0 0 39 39" width="39" height="39" aria-hidden className="block">
            <circle cx="19.5" cy="19.5" r="19.5" fill="white" />
            <path d={HEART_30} transform="translate(4.5 4.5)" fill={heartFill} stroke="black" />
          </svg>
        )}
      </button>
      {/* Under the heart, right-aligned to it and at most 160px wide (wrapping),
          so it stays inside a product card even at 360px; it never moves anything. */}
      <span
        role="alert"
        className={
          failed
            ? "absolute top-full right-0 z-50 mt-2 w-max max-w-[160px] rounded-2xl bg-ink px-2.5 py-1 text-[12px] font-medium text-white"
            : "sr-only"
        }
      >
        {failed ? FAILED : ""}
      </span>
    </span>
  );
}
