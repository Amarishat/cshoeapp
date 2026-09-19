import type { PaymentMethodId, UpiAppId } from "@/lib/types";

/**
 * Payment options from Figma 1:4858, in order. V1 is a prototype: only UPI
 * is selectable and payment is simulated (no gateway).
 */
export interface PaymentMethodOption {
  id: PaymentMethodId;
  name: string;
  subtitle?: string;
  available: boolean;
}

export const paymentMethods: PaymentMethodOption[] = [
  {
    id: "card",
    name: "Credit / Debit / ATM Card",
    subtitle: "Add and secure cards as per RBI guidelines",
    available: false,
  },
  { id: "netbanking", name: "Net Banking", available: false },
  { id: "wallets", name: "Wallets", available: false },
  { id: "upi", name: "UPI", subtitle: "Pay by any UPI app", available: true },
  { id: "cod", name: "Cash on Delivery", available: false },
];

export interface UpiAppOption {
  id: UpiAppId;
  name: string;
  logo: string;
  /** Logo size inside the 43px tile, from Figma. */
  logoWidth: number;
  logoHeight: number;
}

export const upiApps: UpiAppOption[] = [
  { id: "gpay", name: "Google Pay", logo: "/images/payment/google-pay.png", logoWidth: 24.5, logoHeight: 21.3 },
  { id: "phonepe", name: "PhonePe", logo: "/images/payment/phonepe.png", logoWidth: 29.8, logoHeight: 29.8 },
  { id: "paytm", name: "Paytm", logo: "/images/payment/paytm.png", logoWidth: 42.6, logoHeight: 21.3 },
];

export const DEFAULT_UPI_APP: UpiAppId = "gpay";
