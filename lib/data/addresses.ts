import type { Address } from "@/lib/types";

/**
 * Mock saved address for the signed-in user, from the Figma card:
 * "Ryzen · Home — ABC, Bangalore, Karnataka / Chinnaswamy Stadium -778788 / 9989899899".
 */
export const seedAddresses: Address[] = [
  {
    id: "addr-home",
    fullName: "Ryzen",
    phone: "9989899899",
    pincode: "778788",
    state: "Karnataka",
    city: "Bangalore",
    area: "Chinnaswamy Stadium",
    street: "ABC",
    type: "home",
    isDefault: true,
  },
];
