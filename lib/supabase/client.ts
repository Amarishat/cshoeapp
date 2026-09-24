import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public values only (Project Settings → API). They are inlined into the
// browser bundle at build time, so they must be referenced literally here.
// Never put the service-role / secret key or the database password in a
// NEXT_PUBLIC_ variable.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Where the admin client keeps its session, apart from the customer's (default key). */
const ADMIN_STORAGE_KEY = "cshoe-admin-auth";

let client: SupabaseClient | undefined;
let adminClient: SupabaseClient | undefined;

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

function checkedConfig(): { url: string; publishableKey: string } {
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
  return { url, publishableKey };
}

/**
 * The customer app's Supabase client (created once, on first use). Uses the
 * public project URL and publishable/anon key; row level security decides
 * what it can read or write. Its session is the customer's (the anonymous
 * guest), stored under supabase-js's default key.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const config = checkedConfig();
    client = createClient(config.url, config.publishableKey);
  }
  return client;
}

/**
 * The admin screens' Supabase client (created once, on first use). Same
 * project and publishable key as the customer client, but its session is
 * stored under its own key, so an admin sign-in never becomes the customer's
 * session and the customer's guest session never reaches the admin screens.
 */
export function getAdminSupabaseClient(): SupabaseClient {
  if (!adminClient) {
    const config = checkedConfig();
    adminClient = createClient(config.url, config.publishableKey, {
      auth: { storageKey: ADMIN_STORAGE_KEY },
    });
  }
  return adminClient;
}
