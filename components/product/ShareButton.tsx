"use client";

import { Icon } from "@/components/ui/Icon";
import { useShareFeedback } from "@/lib/useShareFeedback";

/**
 * Header share action (30px): native share sheet, or copy the link. Product
 * uses radix-icons:share-2; the Customizer frame uses octicon:share-24.
 * When it falls back to copying, a small message under the icon confirms it
 * ("Link copied" / "Couldn't copy link") and is announced to screen readers.
 */
export function ShareButton({
  title,
  icon = "share",
}: {
  title: string;
  icon?: "share" | "shareOcticon";
}) {
  const { feedback, share } = useShareFeedback();

  function onClick() {
    const url = window.location.href;
    void share({ data: { title, url }, copyText: url, copied: "Link copied", failed: "Couldn't copy link" });
  }

  return (
    <span className="relative flex">
      <button type="button" aria-label={`Share ${title}`} onClick={onClick} className="-m-[7px] flex p-[7px]">
        <Icon name={icon} className="size-[30px]" />
      </button>
      {/* Positioned under the icon so it never shifts the header layout. */}
      <span
        role="status"
        className={
          feedback
            ? "absolute top-full right-0 z-50 mt-2 rounded-full bg-ink px-2.5 py-1 text-[12px] font-medium whitespace-nowrap text-white"
            : "sr-only"
        }
      >
        {feedback}
      </span>
    </span>
  );
}
