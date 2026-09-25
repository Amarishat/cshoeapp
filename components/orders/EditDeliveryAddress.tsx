"use client";

import { useState } from "react";
import { AddressManager } from "@/components/checkout/AddressManager";
import { getOrderByNumber, updateOrderAddress } from "@/lib/data/userOrders";
import type { Address, Order } from "@/lib/types";

/** The shipping fields update_order_address() copies (and compares); the address id is left out. */
const SHIPPING_FIELDS = ["fullName", "phone", "pincode", "state", "city", "area", "street", "type"] as const;

/** Whether two sets of shipping details differ. */
function shippingDiffers(a: Address, b: Address): boolean {
  return SHIPPING_FIELDS.some((field) => a[field] !== b[field]);
}

/** Whether the order's shipping details differ between the two copies. */
function shippingChanged(before: Order, after: Order): boolean {
  return shippingDiffers(before.address, after.address);
}

/**
 * Changing where a confirmed order is delivered (Order Details → Edit Order).
 * The saved addresses and the add/edit form are the usual AddressManager, but
 * in its own-selection mode, so checkout's selected address is never touched.
 * "Update Delivery Address" asks public.update_order_address() to copy the
 * chosen address into the order, then reads the order again and hands the
 * fresh copy to `onUpdated`, saying whether the shipping details actually
 * changed (choosing an identical address changes nothing, and the database
 * then writes nothing). When the change is refused, the order is read
 * again too and handed to `onRefused` with the message (shown here as well),
 * so controls that no longer apply go away.
 */
export function EditDeliveryAddress({
  order,
  onUpdated,
  onRefused,
  onClose,
}: {
  order: Order;
  /** Saved: the fresh order, and whether its shipping details are different from before. */
  onUpdated: (order: Order, changed: boolean) => void;
  /** The change was refused: the order as re-read (null if it couldn't be), and why. */
  onRefused: (fresh: Order | null, message: string) => void;
  onClose: () => void;
}) {
  // The order's current address, if it still has one (it's null once that address was deleted).
  const [selectedId, setSelectedId] = useState<string | null>(order.address.id || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // The saved addresses as AddressManager has loaded them (kept current as they're added or edited).
  const [addresses, setAddresses] = useState<Address[] | null>(null);

  // Nothing to update when the chosen address would leave the order's shipping details as they are.
  // Until the saved addresses have loaded, the preselected current address counts as the same one.
  const selected = addresses?.find((address) => address.id === selectedId);
  const unchanged = selected ? !shippingDiffers(order.address, selected) : selectedId === (order.address.id || null);

  async function update() {
    if (saving || !selectedId) return;
    setSaving(true);
    setError("");
    try {
      await updateOrderAddress(order.id, selectedId);
      const fresh = await getOrderByNumber(order.id);
      if (!fresh) throw new Error("The address was changed, but the order couldn’t be read again. Reload the page.");
      onUpdated(fresh, shippingChanged(order, fresh));
    } catch (thrown) {
      const message = thrown instanceof Error ? thrown.message : String(thrown);
      setError(message);
      let fresh: Order | null = null;
      try {
        fresh = await getOrderByNumber(order.id);
      } catch {
        // Couldn't re-read it: the error is still shown here.
      }
      onRefused(fresh, message);
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
        selection={{ selectedId, onSelect: setSelectedId, onAddresses: setAddresses }}
        className="mt-6"
      />

      <div className="mt-8 flex flex-col items-center gap-3 px-gutter">
        <button
          type="button"
          onClick={() => void update()}
          disabled={saving || !selectedId || unchanged}
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
