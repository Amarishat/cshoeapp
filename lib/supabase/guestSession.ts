import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

/*
 * Anonymous guest session (Supabase Anonymous Sign-ins). There is no login
 * screen: the first visit signs in anonymously and supabase-js keeps the
 * session in this browser's storage, so later visits and reloads reuse the
 * same guest user. The profile row is created by the database trigger
 * (public.handle_new_user) when the guest user is created.
 */

let pending: Promise<Session> | null = null;

async function startGuestSession(): Promise<Session> {
  const auth = getSupabaseClient().auth;

  const existing = await auth.getSession();
  if (existing.error) throw new Error(`Could not read the Supabase session: ${existing.error.message}`);
  if (existing.data.session) return existing.data.session;

  const created = await auth.signInAnonymously();
  if (created.error) {
    throw new Error(`Could not start a guest session: ${created.error.message}`);
  }
  if (!created.data.session) throw new Error("Could not start a guest session: no session was returned.");
  return created.data.session;
}

/**
 * The current Supabase session, creating an anonymous guest session if there
 * is none. Concurrent and repeated calls share one attempt, so a guest user is
 * only created once; after a failure the next call tries again.
 */
export function ensureGuestSession(): Promise<Session> {
  pending ??= startGuestSession().catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}
