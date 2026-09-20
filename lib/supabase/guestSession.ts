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
 * session that changes while the app is open (a real sign-in, a sign-out) is
 * picked up straight away and a real session is never replaced by a guest one.
 * Only the anonymous sign-in itself is shared between callers, so a browser
 * that arrives without a session still creates exactly one guest user.
 */

/** The lookup currently in flight, if any — shared, never kept once settled. */
let resolving: Promise<Session> | null = null;

async function readOrCreateSession(): Promise<Session> {
  const auth = getSupabaseClient().auth;

  const existing = await auth.getSession();
  if (existing.error) throw new Error(`Could not read the Supabase session: ${existing.error.message}`);
  // Any existing session (guest or signed-in) is used as it is.
  if (existing.data.session) return existing.data.session;

  const created = await auth.signInAnonymously();
  if (created.error) throw new Error(`Could not start a guest session: ${created.error.message}`);
  if (!created.data.session) throw new Error("Could not start a guest session: no session was returned.");
  return created.data.session;
}

/**
 * The current Supabase session — the signed-in user's if there is one,
 * otherwise a new anonymous guest.
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
