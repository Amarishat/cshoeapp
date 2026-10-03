import { expect, test } from "../support/mocked-test";

/*
 * Home (/) for a guest, with every Supabase request answered by a mock.
 *
 * The fixture plants a fake anonymous session (so the app never signs up) and mocks the Bag and
 * wishlist reads (cart_items, wishlist_items) with empty lists. This test mocks the three other
 * reads Home makes in the browser — the guest's profile, brands and products — also empty, so
 * Home shows the "Guest" greeting, an empty Bag and the empty Men catalogue. Read-only: nothing
 * is added, changed or ordered. Any request without a mock fails the test (fixture teardown).
 */

/** The five tables Home reads on first load. */
const HOME_TABLE_READS = ["brands", "cart_items", "products", "profiles", "wishlist_items"];

/** Tables whose GET was answered by a mock, from the fixture's redacted request descriptions. */
function mockedTableReads(handled: readonly string[]): string[] {
  return HOME_TABLE_READS.filter((table) =>
    handled.some((entry) => entry.startsWith(`GET local Supabase /rest/v1/${table}?`)),
  );
}

test("Home loads for a guest with an empty Bag, using only mocked Supabase reads", async ({ page, supabase }) => {
  // getProfile() uses .maybeSingle(): postgrest-js reads the list, and an empty one becomes null
  // (no profile row), so the greeting falls back to "Guest".
  supabase.mock({ method: "GET", path: "/rest/v1/profiles", json: [] });
  // getBrands() / getProducts() map arrays: empty lists mean no brands and no products.
  supabase.mock({ method: "GET", path: "/rest/v1/brands", json: [] });
  supabase.mock({ method: "GET", path: "/rest/v1/products", json: [] });

  await page.goto("/");

  // HomeHeader: the <h1> reads "Hey Guest 👋" once the (empty) profile has loaded.
  await expect(page.getByRole("heading", { level: 1, name: "Hey Guest 👋", exact: true })).toBeVisible();
  // BagButton: aria-label is just "Bag" when the Bag has no items.
  await expect(page.getByRole("link", { name: "Bag", exact: true })).toBeVisible();
  // HomeNoProducts: EmptyState <h2> for the default audience (Men) when no section has products.
  await expect(page.getByRole("heading", { level: 2, name: "No Men products yet", exact: true })).toBeVisible();

  // Each of the five reads was answered by a mock (React may repeat some in development, so this
  // checks which tables were read, not how many times).
  await expect.poll(() => mockedTableReads(supabase.handled)).toEqual(HOME_TABLE_READS);
  // The planted guest session was used: no sign-up, token refresh or other auth request.
  expect(supabase.handled.filter((entry) => entry.includes("/auth/"))).toEqual([]);
});
