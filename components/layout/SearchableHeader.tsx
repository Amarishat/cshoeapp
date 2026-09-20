"use client";

import { useState, type ReactNode } from "react";
import { SearchBar } from "@/components/home/SearchBar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Icon } from "@/components/ui/Icon";

/**
 * Screen header whose search icon opens Home's search field under it (Shop,
 * Brand and Customise — Figma shows the icon on all three). It is the same
 * SearchBar and the same /shop?q=… flow as Home; on a search screen the field
 * opens with that search in it so it can be edited. Escape closes it.
 */
export function SearchableHeader({
  leading = "back",
  backHref,
  title,
  actions,
  query,
}: {
  leading?: "back" | "none";
  backHref?: string;
  title: ReactNode;
  /** Trailing actions after the search icon (e.g. the bag button). */
  actions?: ReactNode;
  /** The search this screen is showing, if any — the field opens with it. */
  query?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AppHeader
        leading={leading}
        backHref={backHref}
        title={title}
        actions={
          <>
            <button
              type="button"
              aria-label={open ? "Close search" : "Search"}
              aria-expanded={open}
              onClick={() => setOpen((wasOpen) => !wasOpen)}
              className="flex"
            >
              <Icon name="search" className="size-[30px]" />
            </button>
            {actions}
          </>
        }
      />
      {open && (
        <div className="mt-4 px-gutter">
          <SearchBar
            autoFocus
            defaultValue={query ?? undefined}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
          />
        </div>
      )}
    </>
  );
}
