"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

/**
 * Goes back in history, or to `fallbackHref` when the page was opened
 * directly. With `alwaysFallback`, it always goes to `fallbackHref`.
 */
export function BackButton({
  fallbackHref = "/",
  alwaysFallback = false,
}: {
  fallbackHref?: string;
  alwaysFallback?: boolean;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Back"
      className="-m-[10px] flex p-[10px]"
      onClick={() =>
        !alwaysFallback && window.history.length > 1 ? router.back() : router.push(fallbackHref)
      }
    >
      <Icon name="back" className="size-6" />
    </button>
  );
}
