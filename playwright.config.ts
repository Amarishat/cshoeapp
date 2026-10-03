import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Project } from "@playwright/test";
// Must stay before the next.config import: it sets E2E_NEXT_DIST_DIR for this process first.
import { E2E_NEXT_DIST_DIR } from "./e2e/support/next-dist-dir";
import nextConfig from "./next.config";
import {
  assertLocalSupabaseUrl,
  assertPublishableKey,
  LOCAL_SUPABASE_PORT,
  MOCKED_SUPABASE_PUBLISHABLE_KEY,
  MOCKED_SUPABASE_URL,
} from "./e2e/support/local-supabase";
import {
  APP_ORIGIN,
  CHROME_ARGS,
  E2E_PORT,
  INTEGRATION_PROJECT,
  MOCKED_PROJECT,
  MOCKED_PROXY,
} from "./e2e/support/network-policy";

/**
 * Playwright setup for cshoeapp (minimal harness; no tests yet).
 *
 * Two clearly separated projects:
 *   - "mocked"            e2e/mocked/**  UI tests that must not write to any database. They import
 *                                        `test` from e2e/support/mocked-test.ts, whose network guard
 *                                        answers Supabase only with explicit mocks and fails the test
 *                                        on anything else. Run them with `npm run e2e:mocked` (lint
 *                                        first, and this project only).
 *   - "local-integration" e2e/local/**   tests that may persist data, in LOCAL Supabase only.
 *
 * Safety:
 *   - The app under test is a dedicated `next dev` on port 3100. Its two Supabase variables are
 *     always set explicitly — values set in the process environment take precedence over
 *     .env.local, so the hosted settings there are never used. (npm run dev is deliberately NOT
 *     used: it would load .env.local as-is.)
 *       · mocked runs (E2E_PROJECT_LOCK=mocked): the fixed dead MOCKED_SUPABASE_URL
 *         (127.0.0.1:54399) and a placeholder key — never the real local API or key.
 *       · local-integration (any other run): E2E_SUPABASE_URL / E2E_SUPABASE_PUBLISHABLE_KEY,
 *         which must be the local API (127.0.0.1 or localhost, port 54321) and a non-secret key.
 *   - A non-local E2E_SUPABASE_URL makes this config throw on load: nothing runs, no server starts.
 *   - For local-integration with E2E_SUPABASE_URL unset, no server is configured and global setup
 *     refuses every run; listing tests still works.
 *   - reuseExistingServer is false: an already-running server on 3100 (with unknown settings) is
 *     never used — Playwright fails instead.
 *   - The browser is the installed Chrome (channel "chrome"; no browser download), with DNS limited
 *     to localhost/127.0.0.1, so a hosted Supabase host cannot even be resolved.
 *   - The mocked project adds an unreachable proxy as a network backstop (see network-policy.ts;
 *     not yet verified at runtime), and blocks service workers.
 *   - E2E_PROJECT_LOCK=mocked leaves only the mocked project in the config (any other value or no
 *     lock: only local-integration), so extra --project flags cannot add the other one (Playwright
 *     reports it as not found).
 *   - The E2E server builds into its own directory (E2E_NEXT_DIST_DIR), never the regular .next:
 *     .next-e2e for mocked runs, .next-e2e-integration for local-integration, so no cache compiled
 *     with other (e.g. hosted, or the other project's) NEXT_PUBLIC_* values is reused. This config
 *     refuses to load unless next.config.ts actually resolves distDir to the one for this run.
 */

if (nextConfig.distDir !== E2E_NEXT_DIST_DIR) {
  throw new Error(
    `next.config.ts does not use E2E_NEXT_DIST_DIR (distDir resolved to "${String(nextConfig.distDir)}", ` +
      `expected "${E2E_NEXT_DIST_DIR}"); refusing to run.`,
  );
}

const projectLock = process.env.E2E_PROJECT_LOCK;
if (projectLock !== undefined && projectLock !== MOCKED_PROJECT && projectLock !== INTEGRATION_PROJECT) {
  throw new Error(`E2E_PROJECT_LOCK must be one of: ${MOCKED_PROJECT}, ${INTEGRATION_PROJECT}; refusing to run.`);
}
/**
 * Mocked runs (E2E_PROJECT_LOCK=mocked, as `npm run e2e:mocked` sets) are the only ones with the
 * mocked project, and they never use the real local Supabase: the app server gets the fixed dead
 * MOCKED_SUPABASE_URL and a placeholder key, whatever E2E_SUPABASE_URL / _KEY say, and builds into
 * .next-e2e. Every other run has only local-integration: its server gets the explicitly supplied
 * local API URL (127.0.0.1 or localhost, port 54321 only) and publishable key, and builds into
 * .next-e2e-integration (see e2e/support/next-dist-dir.ts).
 */
const mockedRun = projectLock === MOCKED_PROJECT;

if (new URL(MOCKED_SUPABASE_URL).port === LOCAL_SUPABASE_PORT) {
  throw new Error("MOCKED_SUPABASE_URL must not use the real local Supabase port; refusing to run.");
}

const rawSupabaseUrl = mockedRun ? undefined : process.env.E2E_SUPABASE_URL;
// Fail closed at config load if a URL is given but is not the local API.
const integrationSupabaseUrl = rawSupabaseUrl ? assertLocalSupabaseUrl(rawSupabaseUrl) : undefined;
// The integration server needs the explicitly supplied local key too (never a secret key).
const integrationPublishableKey = integrationSupabaseUrl
  ? assertPublishableKey(process.env.E2E_SUPABASE_PUBLISHABLE_KEY)
  : undefined;

/** The app server's Supabase settings: set explicitly, so .env.local is never used for them. */
const serverSupabaseEnv = mockedRun
  ? { NEXT_PUBLIC_SUPABASE_URL: MOCKED_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: MOCKED_SUPABASE_PUBLISHABLE_KEY }
  : integrationSupabaseUrl && integrationPublishableKey
    ? { NEXT_PUBLIC_SUPABASE_URL: integrationSupabaseUrl, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: integrationPublishableKey }
    : undefined;

/**
 * The project's own installed Next.js CLI. Run directly (not via npx), so starting the server can
 * never fetch anything from the package registry; if it is missing, refuse instead.
 */
const NEXT_BIN = join(__dirname, "node_modules", ".bin", "next");
if (serverSupabaseEnv && !existsSync(NEXT_BIN)) {
  throw new Error(
    `The project's local Next.js executable was not found at ${NEXT_BIN}; refusing to run ` +
      "(nothing is installed or downloaded by the E2E setup).",
  );
}

const mockedProject: Project = {
  name: MOCKED_PROJECT,
  testDir: "./e2e/mocked",
  use: {
    serviceWorkers: "block",
    // Browser-wide backstop (every context this browser creates), and the same on the test's
    // own context. e2e/support/mocked-test.ts refuses to run if either differs.
    launchOptions: { args: [...CHROME_ARGS], proxy: { ...MOCKED_PROXY } },
    proxy: { ...MOCKED_PROXY },
  },
};
const integrationProject: Project = { name: INTEGRATION_PROJECT, testDir: "./e2e/local" };

const projects = mockedRun ? [mockedProject] : [integrationProject];

export default defineConfig({
  testDir: "./e2e",
  // Shared helpers are not tests.
  testIgnore: ["**/support/**"],
  globalSetup: "./e2e/global-setup.ts",
  // One worker: deterministic, and integration tests must never run concurrently.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: APP_ORIGIN,
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
    launchOptions: { args: [...CHROME_ARGS] },
  },
  projects,
  // No server without Supabase settings (integration with E2E_SUPABASE_URL unset; global setup then
  // refuses the run). Mocked: dead URL + placeholder key; integration: the validated local values.
  webServer: serverSupabaseEnv
    ? {
        command: `"${NEXT_BIN}" dev --port ${E2E_PORT}`,
        url: APP_ORIGIN,
        reuseExistingServer: false,
        timeout: 180_000,
        stdout: "ignore",
        stderr: "pipe",
        env: {
          E2E_NEXT_DIST_DIR,
          // Mocked runs: no Next.js telemetry (telemetry.nextjs.org) from the app server.
          ...(mockedRun ? { NEXT_TELEMETRY_DISABLED: "1" } : {}),
          ...serverSupabaseEnv,
        },
      }
    : undefined,
});
