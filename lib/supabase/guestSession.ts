import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

/*
 * Anonymous guest session (Supabase Anonymous Sign-ins). Customer screens have
 * no login: the first visit signs in anonymously and supabase-js keeps the
 * session in this browser's storage, so later visits and reloads reuse the
 * same guest user. The profile row is created by the database trigger
 * (public.handle_new_user) when the guest user is created.
 *
 * Supabase is the source of truth: every call reads the current session, so a
 * session that changes while the app is open (e.g. a sign-out) is picked up
 * straight away. Only an anonymous session is ever used as the customer's:
 * admins sign in through their own client (getAdminSupabaseClient), and any
 * non-anonymous session found here is cleared locally and replaced by a guest.
 * Only the lookup itself is shared between callers, so a browser that arrives
 * without a session still creates exactly one guest user.
 */

/** The lookup currently in flight, if any — shared, never kept once settled. */
let resolving: Promise<Session> | null = null;

async function readOrCreateSession(): Promise<Session> {
  const auth = getSupabaseClient().auth;

  const existing = await auth.getSession();
  if (existing.error) throw new Error(`Could not read the Supabase session: ${existing.error.message}`);
  const session = existing.data.session;
  if (session?.user.is_anonymous) return session;
  if (session) {
    // Customers never sign in, so a non-anonymous session here is someone
    // else's (e.g. an admin's, saved before admin sessions had their own
    // storage). Drop it from this client's storage only — the account's other
    // sessions are left alone — and start a guest instead.
    const signedOut = await auth.signOut({ scope: "local" });
    if (signedOut.error) throw new Error(`Could not clear the previous session: ${signedOut.error.message}`);
  }

  const created = await auth.signInAnonymously();
  if (created.error) throw new Error(`Could not start a guest session: ${created.error.message}`);
  if (!created.data.session) throw new Error("Could not start a guest session: no session was returned.");
  return created.data.session;
}

/**
 * The customer's Supabase session — the existing anonymous guest's if there
 * is one, otherwise a new anonymous guest (never a non-anonymous session).
 *
 * Callers that arrive together share one lookup, so a browser without a
 * session signs in exactly once however many parts of the app ask at the same
 * time. The shared promise is dropped as soon as it settles, so the next call
 * reads the session again: a sign-in or sign-out in between is picked up, and
 * a stale user is never handed out.
 */
export function ensureGuestSession(): Promise<Session> {
  resolving ??= readOrCreateSession().finally(() => {
    resolving = null;
  });
  return resolving;
}
