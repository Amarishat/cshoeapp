import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { WishlistView } from "@/components/wishlist/WishlistView";

export const metadata: Metadata = { title: "Wishlist" };

/**
 * Wishlist — Figma frame 1:5946 (bottom-nav tab; back goes Home, as in Figma).
 * Product info is loaded from Supabase by WishlistView.
 */
export default function WishlistPage() {
  return (
    <>
      <AppHeader leading="back" backHref="/" backAlwaysToHref title="Wishlist" actions={<BagButton />} />
      <WishlistView />
    </>
  );
}
