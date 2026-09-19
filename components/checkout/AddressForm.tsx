"use client";

import Image from "next/image";
import { forwardRef } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import type { AddressErrors } from "@/lib/validation/address";
import type { AddressInput, AddressType, LocationState } from "@/lib/types";

export const emptyAddress: AddressInput = {
  fullName: "",
  phone: "",
  pincode: "",
  state: "",
  city: "",
  area: "",
  street: "",
  type: "home",
  isDefault: false,
};

const types: { value: AddressType; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "office", label: "Office" },
  { value: "other", label: "Other" },
];

/**
 * "Add Shipping Address" form (Figma 1:3402 and 1:3447): labelled 50px fields,
 * two-column Pincode/State and City/Area rows, "Type of Address" radios and
 * "Make as default address".
 */
export const AddressForm = forwardRef<
  HTMLDivElement,
  {
    value: AddressInput;
    onChange: (value: AddressInput) => void;
    errors: AddressErrors;
    locations: LocationState[];
  }
>(function AddressForm({ value, onChange, errors, locations }, ref) {
  const set = (patch: Partial<AddressInput>) => onChange({ ...value, ...patch });
  const state = locations.find((s) => s.name === value.state);
  const city = state?.cities.find((c) => c.name === value.city);
  const digits = (s: string, max: number) => s.replace(/\D/g, "").slice(0, max);

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <TextField
        size="sm"
        label="Full Name"
        placeholder="Enter Your Full Name"
        autoComplete="name"
        value={value.fullName}
        onChange={(e) => set({ fullName: e.target.value })}
        error={errors.fullName}
      />
      <TextField
        size="sm"
        label="Phone Number"
        placeholder="Enter Your Phone Number"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={value.phone}
        onChange={(e) => set({ phone: digits(e.target.value, 10) })}
        error={errors.phone}
      />
      <div className="grid grid-cols-2 gap-x-[50px]">
        <TextField
          size="sm"
          label="Pincode"
          placeholder="123456"
          inputMode="numeric"
          autoComplete="postal-code"
          value={value.pincode}
          onChange={(e) => set({ pincode: digits(e.target.value, 6) })}
          error={errors.pincode}
        />
        <SelectField
          label="State"
          placeholder="Kerala"
          options={locations.map((s) => s.name)}
          value={value.state}
          onChange={(e) => set({ state: e.target.value, city: "", area: "" })}
          error={errors.state}
        />
      </div>
      <div className="grid grid-cols-2 gap-x-[50px]">
        <SelectField
          label="City"
          placeholder="Kozhikode"
          options={state?.cities.map((c) => c.name) ?? []}
          value={value.city}
          disabled={!state}
          onChange={(e) => set({ city: e.target.value, area: "" })}
          error={errors.city}
        />
        <SelectField
          label="Area"
          placeholder="Koyilandi"
          options={city?.areas ?? []}
          value={value.area}
          disabled={!city}
          onChange={(e) => set({ area: e.target.value })}
          error={errors.area}
        />
      </div>
      <TextField
        size="sm"
        label="Street Address"
        placeholder="Abc,Bangalore..."
        autoComplete="street-address"
        value={value.street}
        onChange={(e) => set({ street: e.target.value })}
        error={errors.street}
      />

      <fieldset className="mt-4">
        <legend className="text-body font-medium">Type of Address</legend>
        <div role="radiogroup" aria-label="Type of address" className="mt-6 flex items-center gap-6 pl-2.5">
          {types.map((t) => {
            const checked = value.type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => set({ type: t.value })}
                className="flex items-center gap-6 text-[17px]"
              >
                <Image
                  src={checked ? "/images/checkout/radio-checked.svg" : "/images/checkout/radio.svg"}
                  alt=""
                  width={25}
                  height={25}
                  unoptimized
                />
                {t.label}
              </button>
            );
          })}
        </div>
        <Checkbox
          variant="form"
          checked={value.isDefault}
          onChange={(isDefault) => set({ isDefault })}
          className="mt-6 ml-3 text-[17px]"
        >
          Make as default address
        </Checkbox>
      </fieldset>
    </div>
  );
});
