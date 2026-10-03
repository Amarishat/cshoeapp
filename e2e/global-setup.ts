import { createConnection } from "node:net";
import { assertLocalSupabaseUrl, assertPublishableKey, MOCKED_SUPABASE_URL } from "./support/local-supabase";
import { MOCKED_PROJECT } from "./support/network-policy";

/** How long the mocked-run port check waits for a connection to be accepted or refused. */
const PORT_CHECK_TIMEOUT_MS = 1_000;

/**
 * One TCP connection attempt to host:port, closed straight away. "refused" means nothing is
 * listening; "accepted" means something is; anything else (timeout, other error) is "unknown".
 */
function probeTcp(host: string, port: number, timeoutMs: number): Promise<"refused" | "accepted" | "unknown"> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    let settled = false;
    const finish = (result: "refused" | "accepted" | "unknown") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(result);
    };
    const timer = setTimeout(() => finish("unknown"), timeoutMs);
    socket.once("connect", () => finish("accepted"));
    socket.once("error", (error: NodeJS.ErrnoException) => finish(error.code === "ECONNREFUSED" ? "refused" : "unknown"));
  });
}

/**
 * Mocked runs only: the app server and browser are pointed at MOCKED_SUPABASE_URL
 * (127.0.0.1:54399), which must be dead, so a request that escapes the fixture's mocks is refused.
 * Refuse the run unless a connection there is actively refused. Only that one host and port is
 * contacted.
 */
async function assertMockedSupabasePortIsDead() {
  const url = new URL(MOCKED_SUPABASE_URL);
  if (url.hostname !== "127.0.0.1" || url.port !== "54399") {
    throw new Error("MOCKED_SUPABASE_URL is not http://127.0.0.1:54399; refusing to run.");
  }
  const result = await probeTcp(url.hostname, Number(url.port), PORT_CHECK_TIMEOUT_MS);
  if (result !== "refused") {
    throw new Error(
      result === "accepted"
        ? `Something is listening on ${url.host} (the mocked Supabase URL must be dead); refusing to run.`
        : `Could not confirm that nothing is listening on ${url.host}; refusing to run.`,
    );
  }
}

/**
 * Runs before any test (not when only listing tests). Refuses the whole run unless the app under
 * test is configured for local Supabase only. No database access, no mutations.
 *
 * Mocked runs (E2E_PROJECT_LOCK=mocked) need no Supabase URL or key: playwright.config.ts gives
 * their app server the fixed dead MOCKED_SUPABASE_URL and a placeholder key, and ignores
 * E2E_SUPABASE_URL / E2E_SUPABASE_PUBLISHABLE_KEY, so the real local values are never required.
 * Instead, they check that the dead URL really is dead.
 */
export default async function globalSetup() {
  if (process.env.E2E_PROJECT_LOCK === MOCKED_PROJECT) {
    await assertMockedSupabasePortIsDead();
    return;
  }
  assertLocalSupabaseUrl(process.env.E2E_SUPABASE_URL);
  assertPublishableKey(process.env.E2E_SUPABASE_PUBLISHABLE_KEY);
}
