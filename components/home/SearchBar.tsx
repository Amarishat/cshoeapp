import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { Icon } from "@/components/ui/Icon";

/**
 * Home search field (Figma 1:1716): 55px, white, #CCC border, 7px radius,
 * carbon search icon, "Nike shoe" placeholder, mic and camera icons.
 * Text search submits to /shop?q=…; voice and image search aren't built, so
 * those icons are Coming Soon (one small badge on the bar's top edge).
 */
export function SearchBar() {
  return (
    <form
      role="search"
      action="/shop"
      className="relative flex h-[55px] items-center rounded-[7px] border border-border bg-white pr-3 pl-[15px]"
    >
      <Icon name="search" className="size-[30px]" />
      <input
        type="search"
        name="q"
        placeholder="Nike shoe"
        aria-label="Search shoes"
        enterKeyHint="search"
        className="min-w-0 flex-1 appearance-none bg-transparent pl-3 text-label outline-none placeholder:text-ink/50 [&::-webkit-search-cancel-button]:appearance-none"
      />
      <span role="img" aria-label="Search by voice (coming soon)" className="flex">
        <Icon name="mic" className="size-[30px] opacity-40" />
      </span>
      <span role="img" aria-label="Search by image (coming soon)" className="ml-[15px] flex">
        <Icon name="camera" className="size-[30px] opacity-40" />
      </span>
      <ComingSoonBadge className="absolute -top-2.5 right-2.5" />
    </form>
  );
}
