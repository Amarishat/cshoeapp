import { isIndiaState } from "@/lib/data/locations";
import type { AddressInput } from "@/lib/types";

export type AddressErrors = Partial<Record<keyof AddressInput, string>>;

/**
 * Confirmed V1 rules: all fields required, phone = 10 digits, pincode = 6
 * digits, state one of India's states/UTs; city and area are free text.
 */
export function validateAddress(a: AddressInput): AddressErrors {
  const errors: AddressErrors = {};
  if (!a.fullName.trim()) errors.fullName = "Enter your full name";
  if (!a.phone.trim()) errors.phone = "Enter your phone number";
  else if (!/^\d{10}$/.test(a.phone.trim())) errors.phone = "Phone number must be 10 digits";
  if (!a.pincode.trim()) errors.pincode = "Enter pincode";
  else if (!/^\d{6}$/.test(a.pincode.trim())) errors.pincode = "Pincode must be 6 digits";
  if (!a.state) errors.state = "Select state";
  else if (!isIndiaState(a.state)) errors.state = "Select a state from the list";
  if (!a.city.trim()) errors.city = "Enter city";
  if (!a.area.trim()) errors.area = "Enter area";
  if (!a.street.trim()) errors.street = "Enter street address";
  return errors;
}

export const isValidAddress = (a: AddressInput) => Object.keys(validateAddress(a)).length === 0;
