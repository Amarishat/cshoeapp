import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public values only (Project Settings → API). They are inlined into the
// browser bundle at build time, so they must be referenced literally here.
// Never put the service-role / secret key or the database password in a
// NEXT_PUBLIC_ variable.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && publishableKey);
}

/** True for keys that must never reach the browser (secret / service-role). */
function isPrivilegedKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  // Legacy JWT keys: refuse one whose role is service_role.
  const payload = key.split(".")[1];
  if (!payload) return false;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json?.role === "service_role";
  } catch {
    return false;
  }
}

/**
 * The app's Supabase client (created once, on first use). Uses the public
 * project URL and publishable/anon key; row level security decides what it
 * can read or write.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    );
  }
  if (isPrivilegedKey(publishableKey)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is a secret/service-role key. Use the publishable (or anon) key instead.",
    );
  }
  client ??= createClient(url, publishableKey);
  return client;
}
