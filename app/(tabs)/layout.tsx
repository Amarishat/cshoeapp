import { BottomNav } from "@/components/layout/BottomNav";
import { GuestSessionProvider } from "@/components/providers/GuestSessionProvider";
import { StoreHydration } from "@/lib/store/StoreHydration";

/** Screens reached from the bottom nav: Home, Notifications, Customise, Wishlist, Account. */
export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <GuestSessionProvider>
      <StoreHydration />
      <main className="flex flex-1 flex-col pb-(--bottom-nav-height)">{children}</main>
      <BottomNav />
    </GuestSessionProvider>
  );
}
