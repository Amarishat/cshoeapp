/*
 * India's 28 states and 8 union territories, alphabetically — the choices
 * for the address form's State field. It's the complete list, so State is a
 * dropdown (no typos in the field that matters most for delivery); City and
 * Area are free text, since no complete list of those is kept here.
 */
export const INDIA_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const STATE_SET: ReadonlySet<string> = new Set(INDIA_STATES);

/** Whether `name` is exactly one of INDIA_STATES. */
export function isIndiaState(name: string): boolean {
  return STATE_SET.has(name);
}
