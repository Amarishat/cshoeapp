/**
 * Local-only guard for the Playwright tests.
 *
 * The tests never read .env.local (it points at the hosted project). Mocked runs use the fixed
 * MOCKED_SUPABASE_URL / MOCKED_SUPABASE_PUBLISHABLE_KEY below. For local-integration, the Supabase
 * settings for the app under test come only from two explicit variables, set by whoever runs the
 * tests:
 *
 *   E2E_SUPABASE_URL              must be exactly the local API: http://127.0.0.1:54321
 *                                 (http://localhost:54321 is also accepted)
 *   E2E_SUPABASE_PUBLISHABLE_KEY  the LOCAL publishable key (never a secret/service-role key)
 *
 * Anything else — a hosted *.supabase.co URL, https, another host or port, a path, embedded
 * credentials — is refused, and the test run does not start.
 */

export const LOCAL_SUPABASE_PORT = "54321";
const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost"]);

/**
 * Mocked project only: the Supabase URL its app server and browser are given instead of the real
 * local API. Nothing should listen on this port, so a request that escapes the fixture's mocks is
 * refused instead of reaching local Supabase. It is a fixed value (never read from the
 * environment) and assertLocalSupabaseUrl() never accepts it: local-integration stays on 54321.
 */
export const MOCKED_SUPABASE_URL = "http://127.0.0.1:54399";

/**
 * Mocked project only: a placeholder, not a real key. The `sb_publishable_` prefix passes
 * supabase-js's format check (it only warns, and not for this prefix) and the app's
 * isPrivilegedKey() check, so mocked runs need no real local key.
 */
export const MOCKED_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_e2e_mocked_placeholder_not_a_real_key";

/** Throws unless `raw` is exactly the local Supabase API URL. Returns the normalised origin. */
export function assertLocalSupabaseUrl(raw: string | undefined): string {
  if (!raw) throw new Error("E2E_SUPABASE_URL is not set; refusing to run (local Supabase only).");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("E2E_SUPABASE_URL is not a valid URL; refusing to run.");
  }
  const problems: string[] = [];
  if (url.protocol !== "http:") problems.push(`protocol must be http: (got ${url.protocol})`);
  if (!LOCAL_HOSTNAMES.has(url.hostname)) problems.push(`host must be 127.0.0.1 or localhost (got ${url.hostname})`);
  if (url.port !== LOCAL_SUPABASE_PORT) problems.push(`port must be ${LOCAL_SUPABASE_PORT} (got ${url.port || "default"})`);
  if (url.username || url.password) problems.push("must not contain credentials");
  if (url.pathname !== "/" || url.search || url.hash) problems.push("must be the bare API origin (no path, query or hash)");
  if (problems.length) throw new Error(`E2E_SUPABASE_URL is not the local Supabase API; refusing to run: ${problems.join("; ")}.`);
  return url.origin;
}

/** Throws unless a publishable key is present and is not a secret/service-role key. Never prints it. */
export function assertPublishableKey(key: string | undefined): string {
  if (!key) throw new Error("E2E_SUPABASE_PUBLISHABLE_KEY is not set; refusing to run.");
  if (key.startsWith("sb_secret_")) throw new Error("E2E_SUPABASE_PUBLISHABLE_KEY is a secret key; refusing to run.");
  const payload = key.split(".")[1];
  if (payload) {
    try {
      const claims = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
      if (claims?.role === "service_role") throw new Error("E2E_SUPABASE_PUBLISHABLE_KEY is a service-role key; refusing to run.");
    } catch (e) {
      if (e instanceof Error && e.message.includes("refusing")) throw e;
      // Not a JWT: fine (new-style publishable keys are not JWTs).
    }
  }
  return key;
}
