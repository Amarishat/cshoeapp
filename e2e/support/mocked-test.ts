import { test as base, expect, type BrowserContext, type Request, type Route } from "@playwright/test";
import { LOCAL_SUPABASE_PORT, MOCKED_SUPABASE_URL } from "./local-supabase";
import { APP_ORIGIN, CHROME_ARGS, MOCKED_PROJECT, MOCKED_PROXY } from "./network-policy";

// Mocked tests may import only this file, so the types they need are re-exported here.
export type { BrowserContext, Locator, Page, Request, Response, Route } from "@playwright/test";

/**
 * Network safety fixture for the "mocked" project (tests under e2e/mocked/).
 *
 * Import `test` / `expect` from here instead of "@playwright/test". The guard is built into the
 * `context` fixture (so every `page` too), in tests and in all hooks. Before any page exists, it:
 *
 *   - routes EVERY browser request that is not to the app itself (http://localhost:3100), for all
 *     pages and popups in the context:
 *       · the mocked Supabase origin — exactly MOCKED_SUPABASE_URL (http://127.0.0.1:54399), the
 *         dead URL the mocked app server is given: answered only by an explicit mock registered
 *         here. Nothing is ever continued to the network. A request with no mock is aborted and
 *         recorded — writes (auth, inserts/updates/deletes, RPC, storage, edge functions) and
 *         unmocked reads alike.
 *       · any other origin — the real local API (port 54321), hosted *.supabase.* hosts,
 *         localhost:54399, anything else: aborted and recorded, never answered by a mock.
 *   - routes WebSockets the same way (Supabase Realtime, or anything not the app): closed, recorded.
 *   - watches every request the context reports, and records any non-app request this guard did not
 *     handle itself (a redirect hop, a test's own route that continued it, …).
 *   - blocks the Node-side request methods of context.request / page.request (and route.fetch()).
 *   - plants a fake anonymous guest session in localStorage, so the app's ensureGuestSession()
 *     finds it and never signs in. (The sign-up / token-refresh / sign-out endpoints are also
 *     mocked, so even if the app tries, nothing reaches the network.)
 *   - mocks the reads the customer layouts make on every page: the Bag (cart_items) and the
 *     wishlist (wishlist_items), both empty.
 *
 * At the end of the test it closes the test's pages, waits for requests still being handled, and
 * fails the test if anything was recorded. Descriptions are redacted: method, a conservative
 * allowlisted path (e.g. "/rest/v1/cart_items"), query parameter NAMES only, body size. Never full
 * URLs, other path segments, header values, cookies, keys, tokens, bodies or ids.
 *
 * The "mocked" project also routes the browser through an unreachable proxy (network-policy.ts),
 * so a request that escapes this fixture should still not reach any server but the app (not yet
 * verified at runtime). Before anything else, the fixture refuses to run unless the effective
 * proxy, launch, service-worker and connection options are exactly that safety configuration.
 *
 * Tests add mocks with `supabase.mock(...)`; the latest matching mock wins. A write is only
 * answered if a test mocks it explicitly. Redirects (3xx, Location) cannot be mocked.
 */

/** Fake guest user id used by the planted session and the default mocks. Not a real user. */
export const MOCK_GUEST_USER_ID = "00000000-0000-4000-8000-00000000e2e0";

type Method = "GET" | "HEAD" | "POST" | "PATCH" | "PUT" | "DELETE";

export type SupabaseMock = {
  /** HTTP method to match. */
  method: Method;
  /** Exact pathname, e.g. "/rest/v1/products", "/auth/v1/signup", "/rest/v1/rpc/place_order". */
  path: string;
  /** Optional extra check on the request URL (e.g. its query); the mock only applies when true. */
  match?: (url: URL) => boolean;
  /** Status (default 200). Redirects (300–399) are refused. */
  status?: number;
  /** JSON body (omit for an empty body). */
  json?: unknown;
  /** Extra response headers (e.g. content-range for counts). A Location header is refused. */
  headers?: Record<string, string>;
};

export type SupabaseMocks = {
  /** Register a mock. Later registrations take precedence over earlier ones (and the defaults). */
  mock(mock: SupabaseMock): void;
  /** Redacted descriptions of every request answered by a mock so far (for assertions). */
  readonly handled: readonly string[];
};

type Options = {
  /** Plant the fake guest session before the app loads (default true). */
  plantGuestSession: boolean;
};

const HOSTED_SUPABASE = /(^|\.)supabase\.(co|in|com|net)$/i;
/** host:port of the app (localhost:3100): the only host a mocked test's page may open a WebSocket to. */
const APP_WEBSOCKET_HOST = new URL(APP_ORIGIN).host;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** A JWT-shaped, unsigned, obviously fake token. It is not accepted by any real Supabase. */
function fakeAccessToken(expiresAt: number): string {
  const header = base64url({ alg: "HS256", typ: "JWT" });
  const payload = base64url({
    sub: MOCK_GUEST_USER_ID,
    role: "authenticated",
    aud: "authenticated",
    is_anonymous: true,
    exp: expiresAt,
    iss: "e2e-mock",
  });
  return `${header}.${payload}.e2e-mock-signature`;
}

function fakeSession() {
  // Far in the future, so supabase-js never tries to refresh it.
  const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const now = new Date().toISOString();
  return {
    access_token: fakeAccessToken(expiresAt),
    token_type: "bearer",
    expires_in: 24 * 60 * 60,
    expires_at: expiresAt,
    refresh_token: "e2e-mock-refresh-token",
    user: {
      id: MOCK_GUEST_USER_ID,
      aud: "authenticated",
      role: "authenticated",
      is_anonymous: true,
      email: "",
      phone: "",
      app_metadata: {},
      user_metadata: {},
      identities: [],
      created_at: now,
      updated_at: now,
    },
  };
}

/** supabase-js's default session key: sb-<first label of the API hostname>-auth-token. */
function sessionStorageKey(supabaseOrigin: string): string {
  return `sb-${new URL(supabaseOrigin).hostname.split(".")[0]}-auth-token`;
}

/**
 * Which kind of origin a request goes to. Only "mocked" — exactly the mocked Supabase origin — can
 * be answered by a mock; the other kinds only make violations easier to read.
 */
type OriginKind = "mocked" | "real-local" | "hosted" | "other";

function originKind(url: URL, mockedOrigin: string): OriginKind {
  if (url.origin === mockedOrigin) return "mocked";
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]";
  if (loopback && url.port === LOCAL_SUPABASE_PORT) return "real-local";
  if (HOSTED_SUPABASE.test(url.hostname)) return "hosted";
  return "other";
}

/** Anything that could create or change data: auth, non-GET methods, RPC, storage and functions writes. */
function isPotentiallyMutating(method: string, url: URL): boolean {
  if (url.pathname.startsWith("/auth/")) return url.pathname !== "/auth/v1/user" || method !== "GET";
  if (url.pathname.startsWith("/rest/v1/rpc/")) return true; // functions can write even via GET
  if (url.pathname.startsWith("/functions/")) return true;
  return !SAFE_METHODS.has(method);
}

// ---- Redaction: an allowlist, never the raw URL ------------------------------------------------

/** Postgres-style identifiers (table, RPC, column names). Ids, tokens and emails never match. */
const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;
const AUTH_ENDPOINTS = new Set([
  "signup", "token", "logout", "user", "otp", "verify", "recover", "authorize", "callback",
  "settings", "health", "factors", "magiclink", "invite", "reauthenticate", "resend", "sso", "admin",
]);
const STORAGE_OPERATIONS = new Set(["object", "bucket", "upload", "render", "s3"]);
const FUNCTION_NAME = /^[a-z][a-z0-9_-]{0,40}$/;

/** Keeps only known Supabase path shapes, up to the table / endpoint name; everything else is "…". */
function redactedPath(url: URL, isSupabase: boolean): string {
  if (!isSupabase) return "/…";
  const parts = url.pathname.split("/").slice(1);
  const [service, version, first = "", second = ""] = parts;
  const show = (value: string, ok: boolean) => (value ? `/${ok ? value : "…"}` : "");
  const rest = (shown: number) => (parts.length > shown ? "/…" : "");
  if (version !== "v1") return "/…";
  switch (service) {
    case "rest":
      if (first === "rpc") return `/rest/v1/rpc${show(second, IDENTIFIER.test(second))}${rest(4)}`;
      return `/rest/v1${show(first, IDENTIFIER.test(first))}${rest(3)}`;
    case "auth":
      return `/auth/v1${show(first, AUTH_ENDPOINTS.has(first))}${rest(3)}`;
    case "storage":
      return `/storage/v1${show(first, STORAGE_OPERATIONS.has(first))}${rest(3)}`;
    case "functions":
      return `/functions/v1${show(first, FUNCTION_NAME.test(first))}${rest(3)}`;
    case "realtime":
    case "graphql":
      return `/${service}/v1${rest(2)}`;
    default:
      return "/…";
  }
}

/** method + kind of origin + allowlisted path + query parameter NAMES (identifiers only) + body size. */
function describe(method: string, url: URL, bodyBytes: number | null, supabaseOrigin: string): string {
  const origin = originKind(url, supabaseOrigin);
  // "local Supabase" is the mocked origin (tests match on this label).
  const kind =
    origin === "mocked"
      ? "local Supabase"
      : origin === "real-local"
        ? `REAL local Supabase (port ${LOCAL_SUPABASE_PORT})`
        : origin === "hosted"
          ? "HOSTED Supabase"
          : `non-app origin (${url.protocol.replace(/[^a-z]/g, "").slice(0, 10)})`;
  const names = [...new Set(url.searchParams.keys())].slice(0, 12).map((k) => (IDENTIFIER.test(k) ? k : "…"));
  const query = names.length ? `?${names.map((k) => `${k}=…`).join("&")}` : "";
  const body = bodyBytes ? ` (body ${bodyBytes} bytes)` : "";
  return `${method.slice(0, 10)} ${kind} ${redactedPath(url, origin !== "other")}${query}${body}`;
}

/** describe() that cannot throw (used where the request itself may be malformed). */
function safeDescribe(method: string, rawUrl: string, bodyBytes: number | null, supabaseOrigin: string): string {
  try {
    return describe(method, new URL(rawUrl), bodyBytes, supabaseOrigin);
  } catch {
    return `${method.slice(0, 10)} [unparseable request]`;
  }
}

// ---- Mocks -------------------------------------------------------------------------------------

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, POST, PATCH, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "content-range, x-total-count, content-location",
};

/** Throws for a mock the browser could follow as a redirect (a redirect hop is never routed). */
function assertNotRedirect(mock: SupabaseMock) {
  const status = mock.status ?? 200;
  if (!Number.isInteger(status) || status < 200 || status > 599 || (status >= 300 && status <= 399)) {
    throw new Error(`supabase.mock(): status ${status} is not allowed (redirects and non-HTTP statuses are refused).`);
  }
  if (Object.keys(mock.headers ?? {}).some((name) => name.trim().toLowerCase() === "location")) {
    throw new Error("supabase.mock(): a Location header is not allowed.");
  }
}

async function fulfillMock(route: Route, mock: SupabaseMock) {
  await route.fulfill({
    status: mock.status ?? 200,
    headers: { ...CORS_HEADERS, ...(mock.json !== undefined ? { "content-type": "application/json" } : {}), ...mock.headers },
    body: mock.json !== undefined ? JSON.stringify(mock.json) : "",
  });
}

function defaultMocks(): SupabaseMock[] {
  const session = fakeSession();
  return [
    // Guest auth: answered locally, never sent. (Normally unused: the planted session is found first.)
    { method: "POST", path: "/auth/v1/signup", json: session },
    { method: "POST", path: "/auth/v1/token", match: (u) => u.searchParams.get("grant_type") === "refresh_token", json: session },
    { method: "POST", path: "/auth/v1/logout", status: 204 },
    { method: "GET", path: "/auth/v1/user", json: session.user },
    // Reads made on every customer page (StoreHydration): empty Bag and wishlist.
    { method: "GET", path: "/rest/v1/cart_items", json: [] },
    { method: "GET", path: "/rest/v1/wishlist_items", json: [] },
  ];
}

// ---- Node-side request paths -------------------------------------------------------------------

/**
 * context.request (the same object as every page's page.request) sends requests from Node, outside
 * the browser and its routes. Its request methods are replaced on that one object; `dispose`,
 * `storageState` and `tracing` are left alone because Playwright itself uses them when closing the
 * context. `_innerFetch` is what route.fetch() calls (Playwright 1.63 internals; checked below).
 */
const NODE_REQUEST_METHODS = ["fetch", "get", "head", "post", "put", "patch", "delete", "_innerFetch"];

function blockNodeSideRequests(context: BrowserContext, record: (message: string) => void) {
  const api = context.request as unknown as Record<string, unknown>;
  for (const name of NODE_REQUEST_METHODS) {
    if (typeof api[name] !== "function") {
      throw new Error(`Network guard: context.request.${name} not found (Playwright changed); refusing to run.`);
    }
    const what = name === "_innerFetch" ? "route.fetch()" : `context.request.${name}()`;
    api[name] = async () => {
      record(`Blocked Node-side request: ${what}`);
      throw new Error(`${what} is not allowed in mocked tests: it would bypass the network guard.`);
    };
  }
}

// ---- Effective option check ------------------------------------------------------------------

/** The option fixture values Playwright builds the browser and the test's context from. */
type SafetyOptions = {
  proxy: unknown;
  launchOptions: Record<string, unknown>;
  serviceWorkers: unknown;
  connectOptions: unknown;
  channel: unknown;
  baseURL: unknown;
};

/** Only these launch options may be set; anything else (ignoreDefaultArgs, executablePath, …) is refused. */
const ALLOWED_LAUNCH_OPTIONS = new Set(["args", "proxy", "headless"]);

function isMockedProxy(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const entries = Object.entries(value);
  return (
    entries.length === 2 &&
    (value as Record<string, unknown>).server === MOCKED_PROXY.server &&
    (value as Record<string, unknown>).bypass === MOCKED_PROXY.bypass
  );
}

/**
 * Refuses to run unless the options in effect for this test are the mocked project's safety
 * configuration. These are Playwright's own option fixtures — the values after config, project and
 * any test.use() overrides — which Playwright passes to browserType.launch() and
 * browser.newContext(). (Playwright has no public API to read back what Chrome applied; that part
 * is for the controlled runtime check.)
 */
function assertSafetyOptions(options: SafetyOptions) {
  const problems: string[] = [];
  if (!isMockedProxy(options.proxy)) problems.push("context `proxy` is not the mocked network backstop");
  const launch = options.launchOptions ?? {};
  if (!isMockedProxy(launch.proxy)) problems.push("`launchOptions.proxy` is not the mocked network backstop");
  const extra = Object.keys(launch).filter((key) => !ALLOWED_LAUNCH_OPTIONS.has(key));
  if (extra.length) problems.push(`launch options not allowed: ${extra.join(", ")}`);
  const args = launch.args;
  if (!Array.isArray(args) || args.length !== CHROME_ARGS.length || args.some((arg, i) => arg !== CHROME_ARGS[i])) {
    // Exact match, so no extra switch (e.g. --proxy-server, --no-proxy-server) can be added.
    problems.push("`launchOptions.args` differ from the required Chrome arguments");
  }
  if (options.serviceWorkers !== "block") problems.push("`serviceWorkers` is not \"block\"");
  if (options.connectOptions !== undefined) problems.push("`connectOptions` is set (a remote browser ignores the launch options)");
  if (options.channel !== "chrome") problems.push("`channel` is not \"chrome\"");
  if (options.baseURL !== APP_ORIGIN) problems.push(`\`baseURL\` is not ${APP_ORIGIN}`);
  if (problems.length) {
    throw new Error(`Mocked network safety configuration was changed; refusing to run: ${problems.join("; ")}.`);
  }
}

// ---- The guard ---------------------------------------------------------------------------------

async function installNetworkGuard(context: BrowserContext, options: Options) {
  // The fixed dead URL the mocked app server is given (playwright.config.ts), never read from the
  // environment. Only this exact origin can be answered by a mock (see handle()).
  const supabaseOrigin = new URL(MOCKED_SUPABASE_URL).origin;
  const mocks = defaultMocks();
  const violations: string[] = [];
  const handled: string[] = [];
  /** Requests this guard's route handler took charge of. */
  const processed = new WeakSet<Request>();
  /** Every non-app request the context reported, including redirect hops. */
  const seen: Request[] = [];
  /** Route handlers still running. */
  const inFlight = new Set<Promise<void>>();

  const record = (message: string) => void violations.push(message);
  const isApp = (url: URL) => url.origin === APP_ORIGIN;
  // The app's own dev server WebSocket (Next.js HMR, ws://localhost:3100/_next/…). Its origin is
  // "ws://…", so isApp() never matches it; only plain ws: to exactly the app's host is let through.
  const isAppWebSocket = (url: URL) => url.protocol === "ws:" && url.host === APP_WEBSOCKET_HOST;

  blockNodeSideRequests(context, record);

  context.on("request", (request) => {
    let app = false;
    try {
      app = isApp(new URL(request.url()));
    } catch {
      // Unparseable: treat as non-app.
    }
    if (!app) seen.push(request);
  });

  async function handle(route: Route) {
    const request = route.request();
    processed.add(request);
    const method = request.method();
    let bodyBytes: number | null = null;
    let action: () => Promise<void>;

    // Decide. Any error here is recorded and the request is aborted, never continued.
    try {
      bodyBytes = request.postDataBuffer()?.byteLength ?? null;
      const url = new URL(request.url());
      const origin = originKind(url, supabaseOrigin);
      if (origin !== "mocked") {
        // Only the exact mocked origin may be answered: the real local API, hosted Supabase and
        // every other origin are violations, never fulfilled by a mock (whatever their path).
        const label =
          origin === "real-local"
            ? "Blocked request to the REAL local Supabase"
            : origin === "hosted"
              ? "Blocked request to HOSTED Supabase"
              : "Blocked non-app request";
        record(`${label}: ${describe(method, url, bodyBytes, supabaseOrigin)}`);
        action = () => route.abort("blockedbyclient");
      } else if (method === "OPTIONS") {
        // CORS preflight (Playwright normally answers these itself); the real request still needs a mock.
        action = () => route.fulfill({ status: 204, headers: CORS_HEADERS });
      } else {
        // Reached only for the exact mocked origin (checked above); mocks then match method + path.
        const mock = mocks.findLast((m) => m.method === method && m.path === url.pathname && (!m.match || m.match(url)));
        if (mock) {
          handled.push(describe(method, url, bodyBytes, supabaseOrigin));
          action = () => fulfillMock(route, mock);
        } else {
          const label = isPotentiallyMutating(method, url) ? "Blocked unmocked Supabase WRITE" : "Blocked unmocked Supabase read";
          record(`${label}: ${describe(method, url, bodyBytes, supabaseOrigin)}`);
          action = () => route.abort("blockedbyclient");
        }
      }
    } catch (error) {
      const kind = error instanceof Error ? error.name : "unknown error";
      record(`Network guard error (${kind}); request aborted: ${safeDescribe(method, request.url(), bodyBytes, supabaseOrigin)}`);
      action = () => route.abort("blockedbyclient");
    }

    // Act. If fulfilling fails, fall back to abort; on a closed page both fail, which is fine (the
    // request dies with the page). Never continue().
    try {
      await action();
    } catch {
      await route.abort("blockedbyclient").catch(() => {});
    }
  }

  await context.route(
    (url) => !isApp(url),
    (route) => {
      const work = handle(route).catch(() => {});
      inFlight.add(work);
      void work.finally(() => inFlight.delete(work));
      return work;
    },
  );

  await context.routeWebSocket(
    (url) => !isAppWebSocket(url),
    (ws) => {
      record(`Blocked WebSocket: ${safeDescribe("WS", ws.url(), null, supabaseOrigin)}`);
      // Never connectToServer(): the socket is closed without reaching the network.
      void ws.close({ code: 1008, reason: "blocked by e2e mocked fixture" }).catch(() => {});
    },
  );

  if (options.plantGuestSession) {
    await context.addInitScript(
      ({ key, value, appOrigin }) => {
        try {
          if (window.location.origin !== appOrigin) return;
          if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
        } catch {
          // Storage unavailable (e.g. about:blank): nothing to plant.
        }
      },
      { key: sessionStorageKey(supabaseOrigin), value: JSON.stringify(fakeSession()), appOrigin: APP_ORIGIN },
    );
  }

  /** Runs once the test body and afterEach hooks are done. Returns every recorded violation. */
  async function finish(): Promise<string[]> {
    const settle = async () => {
      while (inFlight.size) await Promise.allSettled([...inFlight]);
    };
    await settle();
    // Close the test's pages so nothing more can start (timers, beacons, late fetches), then wait
    // for whatever their closing triggered.
    await Promise.allSettled(context.pages().map((page) => page.close({ runBeforeUnload: false })));
    await settle();
    for (const request of seen) {
      if (processed.has(request)) continue;
      const how = request.redirectedFrom() ? "redirect hop" : "not routed by the guard";
      record(`Non-app request outside the guard (${how}): ${safeDescribe(request.method(), request.url(), null, supabaseOrigin)}`);
    }
    return [...violations];
  }

  return {
    api: {
      mock: (mock: SupabaseMock) => {
        assertNotRedirect(mock);
        mocks.push(mock);
      },
      get handled() {
        return [...handled];
      },
    } satisfies SupabaseMocks,
    finish,
  };
}

/** The guard installed on each guarded context, so `supabase` can reach that context's mocks. */
const guards = new WeakMap<BrowserContext, SupabaseMocks>();

export const test = base.extend<Options & { supabase: SupabaseMocks; _mockedSafetyCheck: void }>({
  plantGuestSession: [true, { option: true }],
  // Also set on the "mocked" project: a service worker's own requests would bypass context.route.
  serviceWorkers: "block",
  // The API request fixture talks to the network directly (no browser routes), so it is refused —
  // in tests and in every hook.
  request: async ({}, provide) => {
    void provide;
    throw new Error("The `request` fixture is not allowed in mocked tests: it would bypass the network guard.");
  },

  // Depends only on option values (not on the browser or context), so it runs — and refuses —
  // before Playwright launches a browser or creates a context. Auto for tests and beforeEach/
  // afterEach; beforeAll/afterAll hooks reach it through `context` below.
  _mockedSafetyCheck: [
    async ({ proxy, launchOptions, serviceWorkers, connectOptions, channel, baseURL }, provide, testInfo) => {
      if (testInfo.project.name !== MOCKED_PROJECT) {
        throw new Error(`e2e/support/mocked-test.ts is for the "${MOCKED_PROJECT}" project only (got "${testInfo.project.name}").`);
      }
      assertSafetyOptions({
        proxy,
        launchOptions: launchOptions as Record<string, unknown>,
        serviceWorkers,
        connectOptions,
        channel,
        baseURL,
      });
      await provide();
    },
    { auto: true },
  ],

  // The guard lives on the `context` fixture itself (overriding Playwright's, which it wraps), so
  // every context or page a test or ANY hook receives — including beforeAll/afterAll, which get
  // their own context and page — is checked and guarded before it is handed out, and its
  // violations fail that test or hook when it is torn down. `_mockedSafetyCheck` is listed first
  // so it runs before Playwright's context (and browser) are created.
  context: async ({ _mockedSafetyCheck, context, plantGuestSession }, provide) => {
    void _mockedSafetyCheck;
    const guard = await installNetworkGuard(context, { plantGuestSession });
    guards.set(context, guard.api);
    await provide(context);
    const violations = await guard.finish();
    if (violations.length) {
      const list = violations.map((v, i) => `  ${i + 1}. ${v}`).join("\n");
      throw new Error(
        `Mocked test made ${violations.length} blocked network request(s).\n${list}\n` +
          "Add an explicit supabase.mock(...) if the request is expected, or fix the app/test if it is not.",
      );
    }
  },

  supabase: async ({ context }, provide) => {
    const api = guards.get(context);
    if (!api) throw new Error("Network guard missing for this context; refusing to run.");
    await provide(api);
  },
});

export { expect };
