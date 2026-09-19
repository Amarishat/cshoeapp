import { BottomNav } from "@/components/layout/BottomNav";

/** Screens reached from the bottom nav: Home, Notifications, Customise, Wishlist, Account. */
export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="flex flex-1 flex-col pb-(--bottom-nav-height)">{children}</main>
      <BottomNav />
    </>
  );
}
