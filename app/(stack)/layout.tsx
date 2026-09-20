import { AppShell } from "@/components/layout/AppShell";
import { GuestSessionProvider } from "@/components/providers/GuestSessionProvider";
import { StoreHydration } from "@/lib/store/StoreHydration";

/** Screens with a back-arrow header and no bottom nav (Product, Bag, Checkout, …). */
export default function StackLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell>
      <GuestSessionProvider>
        <StoreHydration />
        <main className="flex flex-1 flex-col">{children}</main>
      </GuestSessionProvider>
    </AppShell>
  );
}
