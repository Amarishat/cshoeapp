import { CheckoutGuard } from "@/components/checkout/CheckoutGuard";

/** All checkout steps require selected Bag items. */
export default function CheckoutLayout({ children }: LayoutProps<"/checkout">) {
  return <CheckoutGuard>{children}</CheckoutGuard>;
}
