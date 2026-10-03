import { MOCKED_PROJECT } from "./network-policy";

/**
 * The E2E server's own Next.js output directory, so its build and dev cache (including NEXT_PUBLIC_*
 * values compiled into it) never mix with the regular `next dev` in `.next` — nor with each other:
 * mocked runs (dead Supabase URL) build into `.next-e2e`, local-integration runs (real local API)
 * into `.next-e2e-integration`, so neither can reuse a build compiled with the other's Supabase URL.
 *
 * Importing this module (playwright.config.ts does so before importing next.config.ts) picks the
 * directory from E2E_PROJECT_LOCK (as playwright.config.ts picks the project), refuses a
 * conflicting E2E_NEXT_DIST_DIR and sets it for this process, so next.config.ts is evaluated with
 * the E2E value and the config can check that it really resolves to it.
 */

export const MOCKED_NEXT_DIST_DIR = ".next-e2e";
export const INTEGRATION_NEXT_DIST_DIR = ".next-e2e-integration";

export const E2E_NEXT_DIST_DIR =
  process.env.E2E_PROJECT_LOCK === MOCKED_PROJECT ? MOCKED_NEXT_DIST_DIR : INTEGRATION_NEXT_DIST_DIR;

const inherited = process.env.E2E_NEXT_DIST_DIR;
if (inherited !== undefined && inherited !== E2E_NEXT_DIST_DIR) {
  throw new Error(`E2E_NEXT_DIST_DIR must be "${E2E_NEXT_DIST_DIR}" (or unset) for this E2E run; refusing to run.`);
}
process.env.E2E_NEXT_DIST_DIR = E2E_NEXT_DIST_DIR;
