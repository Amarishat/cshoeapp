"use client";

import { useEffect, useState } from "react";
import { createAddress, listAddresses, updateAddress } from "@/lib/data/userAddresses";
import { useCheckoutStore } from "@/lib/store/checkout";
import type { Address, AddressInput } from "@/lib/types";

export type SavedAddressesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; addresses: Address[] };

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

const noSync = () => {};

/**
 * The guest user's saved addresses from Supabase, kept in sync with the
 * checkout store (which the next checkout steps read) unless `syncCheckout`
 * is false — as when choosing an address for an order that already exists,
 * which must leave checkout alone. `save` writes to Supabase and only
 * reports success once the write has succeeded.
 */
export function useSavedAddresses({ syncCheckout = true }: { syncCheckout?: boolean } = {}) {
  const [state, setState] = useState<SavedAddressesState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const syncCheckoutAddresses = useCheckoutStore((s) => s.syncAddresses);
  // syncAddresses can also change checkout's selected address, so it is skipped entirely when asked.
  const syncAddresses = syncCheckout ? syncCheckoutAddresses : noSync;

  useEffect(() => {
    let cancelled = false;
    listAddresses()
      .then((addresses) => {
        if (cancelled) return;
        setState({ status: "ready", addresses });
        syncAddresses(addresses);
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", message: messageOf(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, syncAddresses]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  /**
   * Creates (or, with `editingId`, updates) an address in Supabase, then
   * reloads the list. Throws if the write fails. Returns the address id.
   */
  async function save(input: AddressInput, editingId: string | null): Promise<string> {
    let id: string;
    if (editingId) {
      await updateAddress(editingId, input);
      id = editingId;
    } else {
      id = await createAddress(input);
    }
    try {
      const addresses = await listAddresses();
      setState({ status: "ready", addresses });
      syncAddresses(addresses);
    } catch (error) {
      // Saved, but the list couldn't be reloaded: show that (with Retry).
      setState({ status: "error", message: messageOf(error) });
    }
    return id;
  }

  return { state, retry, save };
}
