/** Screens with a back-arrow header and no bottom nav (Product, Bag, Checkout, …). */
export default function StackLayout({ children }: LayoutProps<"/">) {
  return <main className="flex flex-1 flex-col">{children}</main>;
}
