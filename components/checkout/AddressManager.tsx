"use client";

import { useRef, useState } from "react";
import { useCheckoutStore } from "@/lib/store/checkout";
import { useStoreHydrated } from "@/lib/store/useStoreHydrated";
import { validateAddress, type AddressErrors } from "@/lib/validation/address";
import type { AddressInput, LocationState } from "@/lib/types";
import { AddressCard } from "./AddressCard";
import { AddressForm, emptyAddress } from "./AddressForm";

/**
 * Saved-address list (select / edit) plus the add-or-edit form — Figma frame
 * 1:3396. Shared by Checkout · Address and Settings · Saved Addresses; both
 * read and write the one checkout address store.
 */
export function AddressManager({
  locations,
  className,
}: {
  locations: LocationState[];
  className?: string;
}) {
  const hydrated = useStoreHydrated(useCheckoutStore.persist);
  const addresses = useCheckoutStore((s) => s.addresses);
  const selectedId = useCheckoutStore((s) => s.selectedAddressId);
  const selectAddress = useCheckoutStore((s) => s.selectAddress);
  const addAddress = useCheckoutStore((s) => s.addAddress);
  const updateAddress = useCheckoutStore((s) => s.updateAddress);

  const [form, setForm] = useState<AddressInput>(emptyAddress);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const errors: AddressErrors = attempted ? validateAddress(form) : {};

  function resetForm() {
    setForm(emptyAddress);
    setEditingId(null);
    setAttempted(false);
  }

  function onSave() {
    setAttempted(true);
    const found = validateAddress(form);
    if (Object.keys(found).length > 0) {
      setStatus("");
      // Move focus to the first field with an error.
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(),
      );
      return;
    }
    const clean = { ...form, fullName: form.fullName.trim(), street: form.street.trim() };
    if (editingId) {
      updateAddress(editingId, clean);
      setStatus("Address updated");
    } else {
      addAddress(clean);
      setStatus("Address saved");
    }
    resetForm();
  }

  function onEdit(id: string) {
    const address = addresses.find((a) => a.id === id);
    if (!address) return;
    const { id: _id, ...input } = address;
    void _id;
    setForm(input);
    setEditingId(id);
    setAttempted(false);
    setStatus("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("input")?.focus({ preventScroll: true }));
  }

  return (
    <div className={className}>
      {hydrated && addresses.length > 0 && (
        <div role="radiogroup" aria-label="Saved addresses" className="mb-10 flex flex-col gap-4 px-gutter">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              selected={address.id === selectedId}
              onSelect={() => selectAddress(address.id)}
              onEdit={() => onEdit(address.id)}
            />
          ))}
        </div>
      )}

      <section aria-labelledby="address-form-heading" className="scroll-mt-4 px-gutter">
        <div className="flex items-center justify-between">
          <h2 id="address-form-heading" className="text-body font-medium">
            {editingId ? "Edit Shipping Address" : "Add Shipping Address"}
          </h2>
          <button type="button" onClick={resetForm} className="text-[17px] text-danger">
            Clear all
          </button>
        </div>

        <div className="mt-6 scroll-mt-24">
          <AddressForm
            ref={formRef}
            value={form}
            onChange={setForm}
            errors={errors}
            locations={locations}
          />
        </div>

        <div className="mt-[39px] flex justify-center">
          <button
            type="button"
            onClick={onSave}
            className="h-[55px] w-full max-w-[360px] rounded-[22px] bg-primary text-body font-semibold text-white"
          >
            SAVE
          </button>
        </div>
        <p role="status" className="mt-3 text-center text-secondary text-ink/70">
          {status}
        </p>
      </section>
    </div>
  );
}
