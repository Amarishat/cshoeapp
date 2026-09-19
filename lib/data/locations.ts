import type { LocationState } from "@/lib/types";

/*
 * Mock state → city → area hierarchy for the Address dropdowns. Replace with
 * a real source (e.g. a pincode lookup API) later; consumers only rely on this
 * shape. Kerala → Kozhikode → Koyilandi is the confirmed V1 path; Karnataka →
 * Bangalore → Chinnaswamy Stadium is included only so the sample saved address
 * from Figma ("ABC, Bangalore, Karnataka / Chinnaswamy Stadium") can be edited.
 */
export const locations: LocationState[] = [
  {
    name: "Kerala",
    cities: [{ name: "Kozhikode", areas: ["Koyilandi"] }],
  },
  {
    name: "Karnataka",
    cities: [{ name: "Bangalore", areas: ["Chinnaswamy Stadium"] }],
  },
];
