import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { WishlistView } from "@/components/wishlist/WishlistView";
import { getCatalogProducts } from "@/lib/data/catalog";

export const metadata: Metadata = { title: "Wishlist" };

/** Wishlist — Figma frame 1:5946 (bottom-nav tab; back goes Home, as in Figma). */
export default async function WishlistPage() {
  const catalog = await getCatalogProducts();

  return (
    <>
      <AppHeader leading="back" backHref="/" backAlwaysToHref title="Wishlist" actions={<BagButton />} />
      <WishlistView catalog={catalog} />
    </>
  );
}
