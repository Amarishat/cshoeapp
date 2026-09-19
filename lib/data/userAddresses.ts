import { getSupabaseClient } from "@/lib/supabase/client";
import { ensureGuestSession } from "@/lib/supabase/guestSession";
import type { Address, AddressInput, AddressType } from "@/lib/types";

/*
 * The current (anonymous guest) user's saved addresses in Supabase
 * (public.addresses). Every call first waits for the guest session; rows are
 * written with that session's user id and RLS only returns the user's own
 * rows. Errors are thrown as-is — never replaced with mock addresses.
 */

interface AddressRow {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  pincode: string;
  state: string;
  city: string;
  area: string;
  street: string;
  type: AddressType;
  is_default: boolean;
  created_at: string;
}

const COLUMNS = "id, user_id, full_name, phone, pincode, state, city, area, street, type, is_default, created_at";

export class AddressError extends Error {
  constructor(action: string, cause: { message: string }) {
    super(`Could not ${action}: ${cause.message}`, { cause });
    this.name = "AddressError";
  }
}

const toAddress = (row: AddressRow): Address => ({
  id: row.id,
  fullName: row.full_name,
  phone: row.phone,
  pincode: row.pincode,
  state: row.state,
  city: row.city,
  area: row.area,
  street: row.street,
  type: row.type,
  isDefault: row.is_default,
});

/** Form values as columns (text trimmed, as the V1 validation checks them). */
const toColumns = (input: AddressInput) => ({
  full_name: input.fullName.trim(),
  phone: input.phone.trim(),
  pincode: input.pincode.trim(),
  state: input.state,
  city: input.city,
  area: input.area,
  street: input.street.trim(),
  type: input.type,
});

async function currentUserId(): Promise<string> {
  return (await ensureGuestSession()).user.id;
}

/** The user's saved addresses, oldest first (the order they were added). */
export async function listAddresses(): Promise<Address[]> {
  const userId = await currentUserId();
  const { data, error } = await getSupabaseClient()
    .from("addresses")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at")
    .order("id")
    .overrideTypes<AddressRow[], { merge: false }>();
  if (error) throw new AddressError("load your saved addresses", error);
  return data.map(toAddress);
}

/**
 * Clears the user's current default (except `keepId`). Runs before a new
 * default is set, so the one-default-per-user index is never violated.
 */
async function clearDefault(userId: string, keepId: string) {
  const { error } = await getSupabaseClient()
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true)
    .neq("id", keepId);
  if (error) throw new AddressError("update your default address", error);
}

async function setDefault(userId: string, id: string) {
  const { error } = await getSupabaseClient()
    .from("addresses")
    .update({ is_default: true })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new AddressError("set your default address", error);
}

/** Saves a new address and returns its id. A default address replaces the old default. */
export async function createAddress(input: AddressInput): Promise<string> {
  const userId = await currentUserId();
  // Inserted as non-default first, then made the default, so a failure part-way
  // never leaves two defaults.
  const { data, error } = await getSupabaseClient()
    .from("addresses")
    .insert({ ...toColumns(input), user_id: userId, is_default: false })
    .select("id")
    .single()
    .overrideTypes<{ id: string }, { merge: false }>();
  if (error) throw new AddressError("save the address", error);
  if (input.isDefault) {
    await clearDefault(userId, data.id);
    await setDefault(userId, data.id);
  }
  return data.id;
}

/** Updates a saved address. Making it the default clears the old default first. */
export async function updateAddress(id: string, input: AddressInput): Promise<void> {
  const userId = await currentUserId();
  if (input.isDefault) await clearDefault(userId, id);
  const { data, error } = await getSupabaseClient()
    .from("addresses")
    .update({ ...toColumns(input), is_default: input.isDefault })
    .eq("user_id", userId)
    .eq("id", id)
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  if (error) throw new AddressError("update the address", error);
  if (data.length === 0) throw new AddressError("update the address", { message: "it no longer exists" });
}
