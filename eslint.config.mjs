import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Mocked Playwright tests: everything must go through e2e/support/mocked-test.ts (its network
  // guard). These rules block the obvious ways around it — other imports, Node-side requests,
  // reflection and computed access, eval, other browsers/contexts, continuing routes, overriding
  // fixtures or the project's safety options. They are a guard against mistakes, NOT a sandbox:
  // test code is ordinary Node.js and lint cannot prevent arbitrary Node networking.
  {
    files: ["e2e/mocked/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Every module specifier except exactly "../support/mocked-test".
              regex: "^(?!\\.\\./support/mocked-test$)",
              message: "Mocked tests may import only ../support/mocked-test (test, expect, types).",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        ...["fetch", "WebSocket", "EventSource", "XMLHttpRequest", "require", "module", "exports", "process",
          "globalThis", "global", "eval", "Function", "Reflect", "Proxy", "WebAssembly"].map((name) => ({
          name,
          message: "Not allowed in mocked tests (network guard bypass).",
        })),
      ],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-restricted-syntax": [
        "error",
        { selector: "ImportExpression", message: "Dynamic import is not allowed in mocked tests." },
        {
          selector: "MemberExpression[property.name=/^(beforeAll|afterAll)$/]",
          message:
            "beforeAll/afterAll are not allowed in mocked tests: worker-scoped fixtures used there are outside the guard. Use beforeEach/afterEach.",
        },
        { selector: "TSImportEqualsDeclaration", message: "import = require() is not allowed in mocked tests." },
        {
          selector: "MemberExpression[computed=true]:not([property.type='Literal'][property.raw=/^\\d+$/])",
          message: "Computed member access (other than a numeric index) is not allowed in mocked tests.",
        },
        { selector: "Property[computed=true]", message: "Computed property keys are not allowed in mocked tests." },
        { selector: "MemberExpression[property.name=/^_/]", message: "Playwright/Node internals (_…) are not allowed in mocked tests." },
        { selector: "Property[key.name=/^_/]", message: "Underscore fixtures/options (e.g. _mockedSafetyCheck) must not be overridden." },
        {
          selector: "MemberExpression[property.name='request']:not(CallExpression > MemberExpression.callee)",
          message: "context.request / page.request / playwright.request bypass the network guard (route.request() is fine).",
        },
        {
          selector:
            "MemberExpression[property.name=/^(fetch|continue|unroute|unrouteAll|routeFromHAR|connectToServer|newContext|launch|launchPersistentContext|launchServer|connect|connectOverCDP|newBrowserCDPSession|newCDPSession|browser|extend|getBuiltinModule|createRequire|binding|dlopen|mainModule|constructor|prototype|__proto__|getPrototypeOf|setPrototypeOf|getOwnPropertyDescriptor|getOwnPropertyDescriptors|getOwnPropertyNames|getOwnPropertySymbols|defineProperty|defineProperties)$/]",
          message: "Not allowed in mocked tests: bypasses or overrides the network guard.",
        },
        {
          selector: "ObjectPattern > Property[key.name=/^(browser|playwright|request|fetch|_.*)$/]",
          message: "The browser / playwright / request / internal fixtures bypass the network guard; use page or context.",
        },
        {
          selector: "MemberExpression[property.name='use']:not(CallExpression > MemberExpression.callee)",
          message: "test.use must be called directly with an object literal.",
        },
        {
          selector: "CallExpression[callee.property.name='use'] > .arguments:not(ObjectExpression)",
          message: "test.use must be called with an object literal (no variables or spreads).",
        },
        { selector: "CallExpression[callee.property.name='use'] SpreadElement", message: "No spreads in test.use." },
        {
          selector:
            "CallExpression[callee.property.name='use'] Property[key.name=/^(serviceWorkers|proxy|launchOptions|contextOptions|storageState|baseURL|channel|connectOptions|headless|context|page|supabase)$/]",
          message: "Mocked tests must not override the project's network safety options or the guarded fixtures.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build output of the Playwright E2E servers (distDir via E2E_NEXT_DIST_DIR):
    ".next-e2e/**",
    ".next-e2e-integration/**",
  ]),
]);

export default eslintConfig;
