"use client";

import { useState } from "react";
import { AddressManager } from "@/components/checkout/AddressManager";
import { getOrderByNumber, updateOrderAddress } from "@/lib/data/userOrders";
import type { LocationState, Order } from "@/lib/types";

/**
 * Changing where a confirmed order is delivered (Order Details → Edit Order).
 * The saved addresses and the add/edit form are the usual AddressManager, but
 * in its own-selection mode, so checkout's selected address is never touched.
 * "Update Delivery Address" asks public.update_order_address() to copy the
 * chosen address into the order, then reads the order again and hands the
 * fresh copy to `onUpdated`.
 */
export function EditDeliveryAddress({
  order,
  locations,
  onUpdated,
  onClose,
}: {
  order: Order;
  locations: LocationState[];
  onUpdated: (order: Order) => void;
  onClose: () => void;
}) {
  // The order's current address, if it still has one (it's null once that address was deleted).
  const [selectedId, setSelectedId] = useState<string | null>(order.address.id || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function update() {
    if (saving || !selectedId) return;
    setSaving(true);
    setError("");
    try {
      await updateOrderAddress(order.id, selectedId);
      const fresh = await getOrderByNumber(order.id);
      if (!fresh) throw new Error("The address was changed, but the order couldn’t be read again. Reload the page.");
      onUpdated(fresh);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : String(thrown));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="edit-address-heading" className="mt-10 border-b border-[#d9d9d9] pb-10">
      <h2 id="edit-address-heading" className="px-gutter text-body font-medium">
        Change Delivery Address
      </h2>
      <p className="mt-2 px-gutter text-[15px] text-ink/70">
        Choose where order {order.id} should be delivered. You can also add or edit a saved address below.
      </p>

      <AddressManager
        locations={locations}
        selection={{ selectedId, onSelect: setSelectedId }}
        className="mt-6"
      />

      <div className="mt-8 flex flex-col items-center gap-3 px-gutter">
        <button
          type="button"
          onClick={() => void update()}
          disabled={saving || !selectedId}
          aria-busy={saving}
          className="h-[55px] w-full max-w-[360px] rounded-[22px] bg-primary text-body font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Updating…" : "Update Delivery Address"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="h-12 w-full max-w-[360px] rounded-[22px] border border-border bg-white text-label font-semibold disabled:opacity-60"
        >
          Cancel
        </button>
        {!selectedId && <p className="text-center text-[15px] text-ink/70">Choose a saved address first.</p>}
        {error && (
          <p role="alert" className="text-center text-secondary text-danger [overflow-wrap:anywhere]">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
