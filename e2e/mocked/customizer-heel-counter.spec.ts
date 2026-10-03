import { expect, MOCK_GUEST_USER_ID, test, type Page } from "../support/mocked-test";

/*
 * The customer customiser hides the Heel Counter part (CustomizerView's HIDDEN_PART_IDS): the 3D
 * model has no separate heel-counter panel, so a colour for it could never show. It is hidden from
 * the part picker only — designs that already include a heel-counter colour must stay valid and
 * keep it when they are added to the Bag or edited.
 *
 * Every Supabase request is answered by a mock with synthetic data (no real catalogue, Bag or
 * user). Writes are mocked too, and only their request bodies are checked: nothing is stored.
 * Assertions use the accessible UI and the request bodies, never the WebGL canvas.
 */

const PRODUCT_ID = "nike-air-force";
const CUSTOMISER_PATH = "/products/nike-air-force/customise";
/** Fake Bag row id (test 3). Not a real row. */
const CART_ITEM_ID = "00000000-0000-4000-8000-0000000ca271";

/** The twelve parts as seeded in supabase/migrations/003_seed_catalog.sql (id, name, sort order). */
const PARTS = [
  { id: "vamp", name: "Vamp", sort_order: 0 },
  { id: "quarter", name: "Quarter", sort_order: 1 },
  { id: "toe-cap", name: "Toe Cap", sort_order: 2 },
  { id: "eyestay", name: "Eyestay", sort_order: 3 },
  { id: "tongue", name: "Tongue", sort_order: 4 },
  { id: "laces", name: "Laces", sort_order: 5 },
  { id: "heel-counter", name: "Heel Counter", sort_order: 6 },
  { id: "swoosh", name: "Swoosh", sort_order: 7 },
  { id: "collar", name: "Collar", sort_order: 8 },
  { id: "midsole", name: "Midsole", sort_order: 9 },
  { id: "outsole", name: "Outsole", sort_order: 10 },
  { id: "heel-tab", name: "Heel Tab", sort_order: 11 },
];

/** The part names the customer can step through, in order: every part except Heel Counter. */
const SELECTABLE_PART_NAMES = PARTS.filter((part) => part.id !== "heel-counter").map((part) => part.name);

/**
 * One customization_configs row in the shape getCustomizationConfig() selects (product with its
 * sizes, parts, colours). loadCustomizerPage() needs at least one part, colour, angle and a
 * default size; the angle is never drawn by the 3D customiser.
 */
const CONFIG_ROW = {
  product_id: PRODUCT_ID,
  title: "Nike Air Force",
  display_category: "Men's Shoes",
  wordmark: "NIKE",
  image_url: "/images/customizer/bag.svg",
  angles: [{ src: "/images/customizer/bag.svg", alt: "", frame: [0, 0, 100, 100], size: [100, 100], rotate: 0 }],
  product: {
    slug: PRODUCT_ID,
    price: 9999,
    discount_label: null,
    is_customizable: true,
    product_sizes: [{ size_uk: 8, is_default: true, sort_order: 0 }],
  },
  customization_parts: PARTS,
  customization_colours: [
    { id: "black", name: "Black", hex: "#1A1A1A", sort_order: 0 },
    { id: "white", name: "White", hex: "#FFFFFF", sort_order: 1 },
    { id: "red", name: "Red", hex: "#E24C4D", sort_order: 2 },
  ],
};

/** A saved design that includes a heel-counter colour (tests 2 and 3). */
const SAVED_DESIGN = { quarter: "black", "heel-counter": "red" };

/** The colour radio group for the part the stepper is on (ColourSwatches: "<part name> colour"). */
function colourGroup(page: Page, partName: string) {
  return page.getByRole("radiogroup", { name: `${partName} colour`, exact: true });
}

/** True for the app's request to the given cart_items method (mocked Supabase origin only). */
function isCartItemsRequest(method: string) {
  return (request: { method(): string; url(): string }) =>
    request.method() === method && new URL(request.url()).pathname === "/rest/v1/cart_items";
}

test.beforeEach(({ supabase }) => {
  // getCustomizationConfig(): read by the customiser page, and again before a design is added or
  // saved (assertDesignCurrent in lib/data/userCart.ts).
  supabase.mock({ method: "GET", path: "/rest/v1/customization_configs", json: [CONFIG_ROW] });
});

test("the part stepper offers 11 parts, never Heel Counter, and wraps around", async ({ page }) => {
  await page.goto(CUSTOMISER_PATH);

  // PartStepper shows "<n>/<count>": 11 selectable parts, not the 12 in the database.
  await expect(colourGroup(page, "Vamp")).toBeVisible();
  await expect(page.getByText(/1\/11$/).first()).toBeVisible();

  // Step forward through every part, in order; Heel Counter is never offered.
  const next = page.getByRole("button", { name: "Next part", exact: true });
  for (const name of SELECTABLE_PART_NAMES) {
    await expect(colourGroup(page, name)).toBeVisible();
    await expect(colourGroup(page, "Heel Counter")).toHaveCount(0);
    await next.click();
  }
  // Wraps from the last part back to the first...
  await expect(colourGroup(page, "Vamp")).toBeVisible();
  // ...and backwards from the first to the last.
  await page.getByRole("button", { name: "Previous part", exact: true }).click();
  await expect(colourGroup(page, "Heel Tab")).toBeVisible();
  await expect(page.getByText(/11\/11$/).first()).toBeVisible();
});

test("a saved draft with a heel-counter colour stays valid and keeps it when added to the Bag", async ({
  page,
  supabase,
}) => {
  // The device draft (lib/store/customization.ts, zustand persist under "cs-customization"),
  // planted before the app loads.
  await page.addInitScript(
    ({ value }) => {
      try {
        window.localStorage.setItem("cs-customization", value);
      } catch {
        // Storage unavailable (e.g. about:blank): nothing to plant.
      }
    },
    { value: JSON.stringify({ state: { drafts: { "nike-air-force": SAVED_DESIGN } }, version: 0 }) },
  );
  // addCartItem() inserts the design (no row returned); the Bag then reloads (default: empty).
  supabase.mock({ method: "POST", path: "/rest/v1/cart_items", status: 201 });

  await page.goto(CUSTOMISER_PATH);
  await expect(colourGroup(page, "Vamp")).toBeVisible();

  // The draft loaded (Quarter is Black) and isn't treated as stale.
  await page.getByRole("button", { name: "Next part", exact: true }).click();
  await expect(colourGroup(page, "Quarter").getByRole("radio", { name: "Black", exact: true })).toBeChecked();
  await expect(page.getByText(/no longer available/)).toHaveCount(0);

  // Colour another part, then add the design.
  await page.getByRole("button", { name: "Previous part", exact: true }).click();
  await colourGroup(page, "Vamp").getByRole("radio", { name: "White", exact: true }).click();

  const insert = page.waitForRequest(isCartItemsRequest("POST"));
  await page.getByRole("button", { name: /^Add Nike Air Force, size UK 8, quantity 1, to bag$/ }).press("Enter");

  // The inserted design still has the heel-counter colour (lib/data/userCart.ts addCartItem).
  expect((await insert).postDataJSON()).toEqual({
    user_id: MOCK_GUEST_USER_ID,
    product_id: PRODUCT_ID,
    size_uk: 8,
    quantity: 1,
    customization: { vamp: "white", quarter: "black", "heel-counter": "red" },
  });
  await expect(page.getByText("Added to bag", { exact: true })).toBeVisible();
});

test("editing a Bag item keeps its heel-counter colour when another part changes", async ({ page, supabase }) => {
  const row = {
    id: CART_ITEM_ID,
    product_id: PRODUCT_ID,
    size_uk: 8,
    quantity: 1,
    is_selected: true,
    customization: SAVED_DESIGN,
    created_at: "2026-01-01T00:00:00Z",
  };
  const edited = { vamp: "white", quarter: "black", "heel-counter": "red" };
  // listCart() and updateCartCustomization()'s product lookup both read cart_items: one Bag item.
  supabase.mock({ method: "GET", path: "/rest/v1/cart_items", json: [row] });
  // updateCartCustomization() updates the row and reads it back.
  supabase.mock({ method: "PATCH", path: "/rest/v1/cart_items", json: [{ ...row, customization: edited }] });
  // After saving, the customiser goes to /bag, whose catalogue reads products (lib/data/bagCatalogue.ts).
  supabase.mock({ method: "GET", path: "/rest/v1/products", json: [] });

  await page.goto(`${CUSTOMISER_PATH}?item=${CART_ITEM_ID}`);

  // Editing the Bag item: its saved design is loaded and isn't treated as stale.
  await expect(page.getByText("Swipe down to save changes", { exact: true })).toBeVisible();
  await expect(page.getByText(/no longer available/)).toHaveCount(0);

  await colourGroup(page, "Vamp").getByRole("radio", { name: "White", exact: true }).click();

  const update = page.waitForRequest(isCartItemsRequest("PATCH"));
  await page.getByRole("button", { name: /^Save changes to Nike Air Force, size UK 8, in your bag$/ }).press("Enter");

  // Only the design is saved, and the heel-counter colour is still in it.
  expect((await update).postDataJSON()).toEqual({ customization: edited });
  await expect(page).toHaveURL(/\/bag$/);
  // Let the Bag finish loading before the test ends, so its catalogue reads are answered by the
  // mocks above rather than cut off as the page closes. With no products in the catalogue
  // (products: []), the Bag lists the item as unavailable (BagView's UnavailableItems note).
  await expect(page.getByRole("status").filter({ hasText: "isn’t available right now" })).toHaveText(
    "1 item in your bag isn’t available right now and can’t be ordered. Remove it",
  );
});
