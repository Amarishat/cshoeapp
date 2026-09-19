"use client";

import { useRef, useState } from "react";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { useCheckoutStore } from "@/lib/store/checkout";
import { validateAddress, type AddressErrors } from "@/lib/validation/address";
import type { AddressInput, LocationState } from "@/lib/types";
import { AddressCard } from "./AddressCard";
import { AddressForm, emptyAddress } from "./AddressForm";
import { useSavedAddresses } from "./useSavedAddresses";

/**
 * Saved-address list (select / edit) plus the add-or-edit form — Figma frame
 * 1:3396. Shared by Checkout · Address and Settings · Saved Addresses. The
 * addresses are the guest user's rows in Supabase (loaded and saved via
 * useSavedAddresses, which also keeps the checkout store in sync).
 */
export function AddressManager({
  locations,
  className,
}: {
  locations: LocationState[];
  className?: string;
}) {
  const { state: list, retry, save } = useSavedAddresses();
  const addresses = list.status === "ready" ? list.addresses : [];
  const selectedId = useCheckoutStore((s) => s.selectedAddressId);
  const selectAddress = useCheckoutStore((s) => s.selectAddress);

  const [form, setForm] = useState<AddressInput>(emptyAddress);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const errors: AddressErrors = attempted ? validateAddress(form) : {};

  function resetForm() {
    setForm(emptyAddress);
    setEditingId(null);
    setAttempted(false);
    setSaveError("");
  }

  async function onSave() {
    if (saving) return;
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
    setSaving(true);
    setStatus("");
    setSaveError("");
    try {
      const id = await save(clean, editingId);
      // As in V1, a newly added address becomes the selected one.
      if (!editingId) selectAddress(id);
      resetForm();
      setStatus(editingId ? "Address updated" : "Address saved");
    } catch (error) {
      // Nothing was saved: keep the form as typed so it can be retried.
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
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
    setSaveError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("input")?.focus({ preventScroll: true }));
  }

  return (
    <div className={className}>
      {list.status === "loading" && (
        <div aria-busy="true" aria-label="Loading saved addresses" className="mb-10 px-gutter">
          <div className="h-[170px] animate-pulse rounded-[20px] bg-surface" />
        </div>
      )}
      {list.status === "error" && (
        <div className="mb-10">
          <CatalogueError title="Couldn’t load your saved addresses." message={list.message} onRetry={retry} />
        </div>
      )}
      {addresses.length > 0 && (
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
            disabled={saving}
            aria-busy={saving}
            className="h-[55px] w-full max-w-[360px] rounded-[22px] bg-primary text-body font-semibold text-white disabled:opacity-60"
          >
            SAVE
          </button>
        </div>
        {saveError && (
          <p role="alert" className="mt-3 text-center text-secondary text-danger [overflow-wrap:anywhere]">
            {saveError}
          </p>
        )}
        <p role="status" className="mt-3 text-center text-secondary text-ink/70">
          {status}
        </p>
      </section>
    </div>
  );
}
