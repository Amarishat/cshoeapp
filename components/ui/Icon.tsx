import { cn } from "@/lib/cn";

/**
 * Every Iconify icon the app uses, keyed by a short name. The Figma layer names
 * give the exact Iconify icon (e.g. "ep:back"). Class names must stay literal
 * strings so the Tailwind Iconify plugin can find and compile them.
 */
const icons = {
  ar: "icon-[ion--logo-apple-ar]",
  back: "icon-[ep--back]",
  bag: "icon-[f7--bag]",
  bell: "icon-[lets-icons--bell-light]",
  bookmark: "icon-[material-symbols-light--bookmark-outline]",
  camera: "icon-[ph--camera-light]",
  community: "icon-[iconoir--community]",
  help: "icon-[material-symbols-light--help-outline]",
  location: "icon-[ion--location-outline]",
  rewards: "icon-[material-symbols-light--rewarded-ads-outline]",
  chevronDown: "icon-[formkit--down]",
  chevronUp: "icon-[formkit--up]",
  edit: "icon-[ic--round-edit]",
  heart: "icon-[material-symbols-light--favorite-outline]",
  heartFilled: "icon-[material-symbols-light--favorite]",
  handCash: "icon-[iconoir--hand-cash]",
  home: "icon-[iconamoon--home-light]",
  homeRound: "icon-[ic--round-home]",
  locationRound: "icon-[ic--round-location-on]",
  workRound: "icon-[ic--round-work]",
  menu: "icon-[material-symbols--menu]",
  mic: "icon-[lets-icons--mic-light]",
  minus: "icon-[iconoir--minus]",
  plus: "icon-[iconoir--plus]",
  search: "icon-[carbon--search]",
  share: "icon-[radix-icons--share-2]",
  shareOutline: "icon-[material-symbols-light--share-outline]",
  shareOcticon: "icon-[octicon--share-24]",
  star: "icon-[ic--round-star]",
  tune: "icon-[material-symbols-light--tune]",
  user: "icon-[circum--user]",
} as const;

export type IconName = keyof typeof icons;

/** Decorative icon; size with `size-[…]`, colour with `text-…`. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return <span aria-hidden className={cn("inline-block shrink-0", icons[name], className)} />;
}
