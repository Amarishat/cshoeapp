/**
 * Network safety settings shared by playwright.config.ts (which applies them) and
 * e2e/support/mocked-test.ts (which refuses to run if the effective options differ).
 */

export const E2E_PORT = 3100;
/** The app under test, and the only origin the mocked project's browser may reach. */
export const APP_ORIGIN = `http://localhost:${E2E_PORT}`;

/** Both projects: installed Chrome, DNS limited to localhost/127.0.0.1, background traffic off. */
export const CHROME_ARGS: readonly string[] = Object.freeze([
  "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-sync",
  "--no-first-run",
  "--no-default-browser-check",
]);

/**
 * Mocked project only: a fail-closed network backstop. Chrome sends everything except the app
 * through a proxy that cannot exist (.invalid never resolves, and the DNS rules above map it to
 * NOTFOUND as well), so a request that escapes the fixture's routes — a test's own route that
 * continues it, a redirect hop, a frameless or worker request — fails instead of reaching a server.
 *
 * Bypass list, in this order:
 *   "<-loopback>"     Chrome otherwise never proxies 127.0.0.1/localhost, which would let
 *                     127.0.0.1:54321 (local Supabase) through. Listing it ourselves also stops
 *                     Playwright from adding it (it adds it only when no loopback entry is
 *                     listed) and keeps the order fixed.
 *   "localhost:3100"  the app (host AND port), the only thing allowed to bypass. Chrome is expected
 *                     to let later rules override earlier ones, so this must come after "<-loopback>".
 * Never list a bare "localhost" or "127.0.0.1" here: Playwright would then drop "<-loopback>" and
 * every loopback port, including Supabase's, would bypass the proxy.
 *
 * UNVERIFIED: Chrome's handling of this list (rule order, "<-loopback>", no direct fallback) has
 * not yet been tested in a controlled local-only run.
 */
export const MOCKED_PROXY: Readonly<{ server: string; bypass: string }> = Object.freeze({
  server: "http://e2e-network-blocked.invalid:9",
  bypass: `<-loopback>,localhost:${E2E_PORT}`,
});

/** Project names. E2E_PROJECT_LOCK (set by `npm run e2e:mocked`) limits the config to one of them. */
export const MOCKED_PROJECT = "mocked";
export const INTEGRATION_PROJECT = "local-integration";
