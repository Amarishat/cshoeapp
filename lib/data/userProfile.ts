import { getSupabaseClient } from "@/lib/supabase/client";
import { ensureGuestSession } from "@/lib/supabase/guestSession";

/*
 * The current (anonymous guest) user's profile in Supabase (public.profiles).
 * The row is created with the guest user by the database trigger
 * (handle_new_user); only first_name and city can be changed. Every call
 * first waits for the guest session, and RLS limits it to that user's own
 * row. Errors are thrown as-is — never replaced with mock data.
 */

export interface UserProfile {
  /** Empty for a new guest (nothing is made up for it). */
  firstName: string;
  city: string | null;
}

interface ProfileRow {
  first_name: string;
  city: string | null;
}

export class ProfileError extends Error {
  constructor(action: string, cause: { message: string }) {
    super(`Could not ${action}: ${cause.message}`, { cause });
    this.name = "ProfileError";
  }
}

const toProfile = (row: ProfileRow): UserProfile => ({ firstName: row.first_name, city: row.city });

async function currentUserId(): Promise<string> {
  return (await ensureGuestSession()).user.id;
}

/** The user's profile; null if the row doesn't exist yet. */
export async function getProfile(): Promise<UserProfile | null> {
  const userId = await currentUserId();
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select("first_name, city")
    .eq("id", userId)
    .maybeSingle()
    .overrideTypes<ProfileRow | null, { merge: false }>();
  if (error) throw new ProfileError("load your profile", error);
  return data ? toProfile(data) : null;
}

/** Saves the user's name and city (the only fields a user may change). */
export async function updateProfile({ firstName, city }: UserProfile): Promise<UserProfile> {
  const userId = await currentUserId();
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .update({ first_name: firstName.trim(), city: city?.trim() || null })
    .eq("id", userId)
    .select("first_name, city")
    .maybeSingle()
    .overrideTypes<ProfileRow | null, { merge: false }>();
  if (error) throw new ProfileError("save your profile", error);
  if (!data) throw new ProfileError("save your profile", { message: "your profile no longer exists" });
  return toProfile(data);
}
