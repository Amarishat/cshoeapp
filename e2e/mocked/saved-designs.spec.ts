import { expect, MOCK_GUEST_USER_ID, test, type Page } from "../support/mocked-test";

/*
 * Saved Designs (My Designs): Save Design in the customiser, the /designs list, opening a saved
 * design back into the customiser, Update Design, Delete, and Add to Bag from a saved design.
 *
 * Every Supabase request is answered by a mock with synthetic data (no real catalogue, design,
 * Bag or user). Writes are mocked too, and only their request bodies and filters are checked:
 * nothing is stored. Assertions use the accessible UI and the requests, never the WebGL canvas.
 */

const PRODUCT_ID = "nike-air-force";
const CUSTOMISER_PATH = "/products/nike-air-force/customise";
const DESIGNS_PATH = "/rest/v1/saved_designs";
/** Fake saved design ids. Not real rows. */
const DESIGN_ID = "00000000-0000-4000-8000-0000000de510";
const OTHER_DESIGN_ID = "00000000-0000-4000-8000-0000000de511";

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

/** One customization_configs row in the shape getCustomizationConfig() selects. */
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

/** The product as getProducts() reads it (My Designs shows its name). */
const PRODUCT_ROW = {
  id: PRODUCT_ID,
  slug: PRODUCT_ID,
  brand_id: "nike",
  name: "Nike Air Force",
  short_name: null,
  category: "Men's Shoes",
  audience: "men",
  price: 9999,
  discount_label: null,
  rating: 4.5,
  description_excerpt: null,
  description_rest: null,
  details: null,
  card_image: { src: "/images/customizer/bag.svg", box: [0, 0, 100, 100] },
  cutout_url: null,
  cutout_frame: null,
  has_product_page: false,
  is_customizable: true,
  home_sections: [],
  created_at: "2026-01-01T00:00:00Z",
  brand: { id: "nike", name: "Nike" },
};

/** A saved_designs row (userDesigns.ts COLUMNS); fake ids, never a real row. */
function designRow(fields: {
  id: string;
  name: string | null;
  customization: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}) {
  return {
    product_id: PRODUCT_ID,
    created_at: "2026-01-05T10:00:00Z",
    updated_at: "2026-01-05T10:00:00Z",
    ...fields,
  };
}

const RED_DESIGN = designRow({ id: DESIGN_ID, name: "My red Air Force", customization: { vamp: "red", quarter: "black" } });
const WHITE_DESIGN = designRow({
  id: OTHER_DESIGN_ID,
  name: null,
  customization: { vamp: "white" },
  created_at: "2026-01-02T10:00:00Z",
  updated_at: "2026-01-03T10:00:00Z",
});

/** The colour radio group for the part the stepper is on (ColourSwatches: "<part name> colour"). */
function colourGroup(page: Page, partName: string) {
  return page.getByRole("radiogroup", { name: `${partName} colour`, exact: true });
}

/** True for the app's request with this method to the given table (mocked Supabase origin only). */
function isTableRequest(method: string, path: string) {
  return (request: { method(): string; url(): string }) =>
    request.method() === method && new URL(request.url()).pathname === path;
}

/** Every request with this method to saved_designs, as it happens (to check none or only one was sent). */
function recordDesignRequests(page: Page, method: string) {
  const urls: string[] = [];
  page.on("request", (sent) => {
    if (isTableRequest(method, DESIGNS_PATH)(sent)) urls.push(sent.url());
  });
  return urls;
}

/** One saved design on My Designs (DesignCard: an <article> named after the design). */
function designCard(page: Page, name: string) {
  return page.getByRole("article", { name, exact: true });
}

test.beforeEach(({ supabase }) => {
  // getCustomizationConfig(): the customiser page, My Designs, and the checks before saving.
  supabase.mock({ method: "GET", path: "/rest/v1/customization_configs", json: [CONFIG_ROW] });
});

test("Save Design saves the current colours once, keeps them, and opens the saved design", async ({
  page,
  supabase,
}) => {
  const saved = designRow({ id: DESIGN_ID, name: "Nike Air Force · saved", customization: { vamp: "red" } });
  // createDesign() inserts and reads the row back as one object (.single()).
  supabase.mock({ method: "POST", path: DESIGNS_PATH, status: 201, json: saved });
  // If the opened design were read again, it's the same row.
  supabase.mock({ method: "GET", path: DESIGNS_PATH, json: [saved] });
  const posts = recordDesignRequests(page, "POST");

  await page.goto(CUSTOMISER_PATH);
  await colourGroup(page, "Vamp").getByRole("radio", { name: "Red", exact: true }).click();

  const insert = page.waitForRequest(isTableRequest("POST", DESIGNS_PATH));
  // Two quick presses save once.
  await page.getByRole("button", { name: "Save Design", exact: true }).dblclick();
  const body = (await insert).postDataJSON();
  expect(body).toMatchObject({
    user_id: MOCK_GUEST_USER_ID,
    product_id: PRODUCT_ID,
    customization: { vamp: "red" },
  });
  // No name was given: an automatic one, starting with the shoe's name.
  expect(body.name).toMatch(/^Nike Air Force · /);

  await expect(page.getByRole("status").filter({ hasText: "Design saved." })).toBeVisible();
  await expect(page.getByRole("link", { name: "View My Designs", exact: true })).toHaveAttribute("href", "/designs");
  // Now the saved design is open: saving again updates it instead of saving another.
  await expect(page).toHaveURL(`${CUSTOMISER_PATH}?design=${DESIGN_ID}`);
  await expect(page.getByRole("button", { name: "Update Design", exact: true })).toBeVisible();
  // The colours on screen and the device draft are unchanged.
  await expect(colourGroup(page, "Vamp").getByRole("radio", { name: "Red", exact: true })).toBeChecked();
  expect(await page.evaluate(() => window.localStorage.getItem("cs-customization"))).toContain('"vamp":"red"');
  expect(posts).toHaveLength(1);
});

test("Save Design with no colour chosen asks for one and saves nothing", async ({ page }) => {
  const posts = recordDesignRequests(page, "POST");
  await page.goto(CUSTOMISER_PATH);
  await page.getByRole("button", { name: "Save Design", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Choose a colour for at least one part" })).toBeVisible();
  expect(posts).toHaveLength(0);
});

test("My Designs lists saved designs with their name, shoe, date and actions", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: DESIGNS_PATH, json: [RED_DESIGN, WHITE_DESIGN] });
  supabase.mock({ method: "GET", path: "/rest/v1/products", json: [PRODUCT_ROW] });

  await page.goto("/designs");
  await expect(page.getByText("2 designs", { exact: true })).toBeVisible();

  const red = designCard(page, "My red Air Force");
  await expect(red).toBeVisible();
  await expect(red.getByText("Nike Air Force", { exact: true })).toBeVisible();
  await expect(red.getByText("Saved 5 Jan 2026", { exact: true })).toBeVisible();
  await expect(red.getByRole("link", { name: "Open My red Air Force", exact: true })).toHaveAttribute(
    "href",
    `${CUSTOMISER_PATH}?design=${DESIGN_ID}`,
  );
  await expect(red.getByRole("button", { name: "Delete My red Air Force", exact: true })).toBeVisible();

  // A design saved without a name, and changed since it was saved.
  const untitled = designCard(page, "Untitled design");
  await expect(untitled.getByText("Updated 3 Jan 2026", { exact: true })).toBeVisible();
});

test("Open loads the saved design into the customiser", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: DESIGNS_PATH, json: [RED_DESIGN, WHITE_DESIGN] });
  supabase.mock({ method: "GET", path: "/rest/v1/products", json: [PRODUCT_ROW] });
  // getDesign(): this one design, by id.
  supabase.mock({
    method: "GET",
    path: DESIGNS_PATH,
    match: (url) => url.searchParams.get("id") === `eq.${DESIGN_ID}`,
    json: [RED_DESIGN],
  });

  await page.goto("/designs");
  await designCard(page, "My red Air Force").getByRole("link", { name: "Open My red Air Force", exact: true }).click();

  await expect(page).toHaveURL(`${CUSTOMISER_PATH}?design=${DESIGN_ID}`);
  await expect(page.getByRole("button", { name: "Update Design", exact: true })).toBeVisible();
  await expect(colourGroup(page, "Vamp").getByRole("radio", { name: "Red", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Next part", exact: true }).click();
  await expect(colourGroup(page, "Quarter").getByRole("radio", { name: "Black", exact: true })).toBeChecked();
});

test("changing an opened design and pressing Update Design saves it", async ({ page, supabase }) => {
  const edited = { vamp: "red", quarter: "white" };
  supabase.mock({ method: "GET", path: DESIGNS_PATH, json: [RED_DESIGN] });
  // updateDesign() updates the row and reads it back.
  supabase.mock({
    method: "PATCH",
    path: DESIGNS_PATH,
    json: [{ ...RED_DESIGN, customization: edited, updated_at: "2026-01-06T10:00:00Z" }],
  });
  const posts = recordDesignRequests(page, "POST");

  await page.goto(`${CUSTOMISER_PATH}?design=${DESIGN_ID}`);
  await expect(colourGroup(page, "Vamp").getByRole("radio", { name: "Red", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Next part", exact: true }).click();
  await colourGroup(page, "Quarter").getByRole("radio", { name: "White", exact: true }).click();

  const update = page.waitForRequest(isTableRequest("PATCH", DESIGNS_PATH));
  await page.getByRole("button", { name: "Update Design", exact: true }).click();
  const sent = await update;
  expect(sent.postDataJSON()).toEqual({ customization: edited });
  const filters = new URL(sent.url()).searchParams;
  expect(filters.get("id")).toBe(`eq.${DESIGN_ID}`);
  expect(filters.get("user_id")).toBe(`eq.${MOCK_GUEST_USER_ID}`);

  await expect(page.getByRole("status").filter({ hasText: "Design updated." })).toBeVisible();
  await expect(colourGroup(page, "Quarter").getByRole("radio", { name: "White", exact: true })).toBeChecked();
  expect(posts).toHaveLength(0);
});

test("Delete removes a design after confirming", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: DESIGNS_PATH, json: [RED_DESIGN, WHITE_DESIGN] });
  supabase.mock({ method: "GET", path: "/rest/v1/products", json: [PRODUCT_ROW] });
  supabase.mock({ method: "DELETE", path: DESIGNS_PATH, status: 204 });

  await page.goto("/designs");
  await designCard(page, "Untitled design").getByRole("button", { name: "Delete Untitled design", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this design?", exact: true });
  await expect(dialog).toBeVisible();

  const removal = page.waitForRequest(isTableRequest("DELETE", DESIGNS_PATH));
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  const filters = new URL((await removal).url()).searchParams;
  expect(filters.get("id")).toBe(`eq.${OTHER_DESIGN_ID}`);
  expect(filters.get("user_id")).toBe(`eq.${MOCK_GUEST_USER_ID}`);

  await expect(page.getByRole("status").filter({ hasText: "Design deleted." })).toBeVisible();
  await expect(designCard(page, "Untitled design")).toHaveCount(0);
  await expect(designCard(page, "My red Air Force")).toBeVisible();
  await expect(page.getByText("1 design", { exact: true })).toBeVisible();
});

test("deleting the last design shows the empty state", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: DESIGNS_PATH, json: [RED_DESIGN] });
  supabase.mock({ method: "GET", path: "/rest/v1/products", json: [PRODUCT_ROW] });
  supabase.mock({ method: "DELETE", path: DESIGNS_PATH, status: 204 });

  await page.goto("/designs");
  await designCard(page, "My red Air Force").getByRole("button", { name: "Delete My red Air Force", exact: true }).click();
  await page.getByRole("dialog", { name: "Delete this design?", exact: true }).getByRole("button", { name: "Delete", exact: true }).click();

  await expect(page.getByRole("heading", { name: "No saved designs yet", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start Designing", exact: true })).toHaveAttribute("href", "/customise");
  await expect(page.getByRole("status").filter({ hasText: "Design deleted." })).toBeVisible();
});

test("a guest with no saved designs sees the empty state", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: DESIGNS_PATH, json: [] });

  await page.goto("/designs");
  await expect(page.getByRole("heading", { name: "No saved designs yet", exact: true })).toBeVisible();
});

test("Add to Bag from an opened saved design adds a copy and keeps the design open", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: DESIGNS_PATH, json: [RED_DESIGN] });
  // addCartItem() inserts the design (no row returned); the Bag then reloads (default: empty).
  supabase.mock({ method: "POST", path: "/rest/v1/cart_items", status: 201 });

  await page.goto(`${CUSTOMISER_PATH}?design=${DESIGN_ID}`);
  await expect(page.getByRole("button", { name: "Update Design", exact: true })).toBeVisible();

  const insert = page.waitForRequest(isTableRequest("POST", "/rest/v1/cart_items"));
  await page.getByRole("button", { name: /^Add Nike Air Force, size UK 8, quantity 1, to bag$/ }).press("Enter");
  expect((await insert).postDataJSON()).toEqual({
    user_id: MOCK_GUEST_USER_ID,
    product_id: PRODUCT_ID,
    size_uk: 8,
    quantity: 1,
    customization: { vamp: "red", quarter: "black" },
  });
  await expect(page.getByText("Added to bag", { exact: true })).toBeVisible();

  // The saved design is still open, in its colours (only a new design's draft is cleared after adding).
  await expect(page.getByRole("button", { name: "Update Design", exact: true })).toBeVisible();
  await expect(colourGroup(page, "Vamp").getByRole("radio", { name: "Red", exact: true })).toBeChecked();
});

test("a saved design with a colour that no longer exists can't be updated", async ({ page, supabase }) => {
  const stale = designRow({ id: DESIGN_ID, name: "Gold Air Force", customization: { vamp: "gold" } });
  supabase.mock({ method: "GET", path: DESIGNS_PATH, json: [stale] });
  const patches = recordDesignRequests(page, "PATCH");

  await page.goto(`${CUSTOMISER_PATH}?design=${DESIGN_ID}`);
  const note = page.getByRole("alert").filter({ hasText: "no longer available" });
  await expect(note).toContainText("This saved design uses a colour or part that’s no longer available.");

  await page.getByRole("button", { name: "Update Design", exact: true }).click();
  await expect(note).toBeVisible();
  expect(patches).toHaveLength(0);
});

test("a saved design that can't be found opens as a new design", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: DESIGNS_PATH, json: [] });

  await page.goto(`${CUSTOMISER_PATH}?design=${DESIGN_ID}`);
  await expect(page.getByRole("alert").filter({ hasText: "couldn’t be found" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Design", exact: true })).toBeVisible();
});

/** Plants the device draft (lib/store/customization.ts) before the app first loads, if there's none yet. */
async function plantDraft(page: Page, draft: Record<string, string>) {
  await page.addInitScript(
    ({ value }) => {
      try {
        if (window.localStorage.getItem("cs-customization") === null) {
          window.localStorage.setItem("cs-customization", value);
        }
      } catch {
        // Storage unavailable (e.g. about:blank): nothing to plant.
      }
    },
    { value: JSON.stringify({ state: { drafts: { "nike-air-force": draft } }, version: 0 }) },
  );
}

test("New Design leaves the saved design unchanged and starts a blank design", async ({ page, supabase }) => {
  // Right after Save Design the device draft still holds the saved design's colours.
  await plantDraft(page, RED_DESIGN.customization);
  supabase.mock({ method: "GET", path: DESIGNS_PATH, json: [RED_DESIGN] });
  const designWrites = {
    post: recordDesignRequests(page, "POST"),
    patch: recordDesignRequests(page, "PATCH"),
    delete: recordDesignRequests(page, "DELETE"),
  };
  const bagAdds: string[] = [];
  page.on("request", (sent) => {
    if (isTableRequest("POST", "/rest/v1/cart_items")(sent)) bagAdds.push(sent.url());
  });

  await page.goto(`${CUSTOMISER_PATH}?design=${DESIGN_ID}`);
  await expect(colourGroup(page, "Vamp").getByRole("radio", { name: "Red", exact: true })).toBeChecked();
  // Move off the first part, to see the new design start from the beginning.
  await page.getByRole("button", { name: "Next part", exact: true }).click();
  await page.getByRole("button", { name: "New Design", exact: true }).click();

  // Out of the saved design: the plain customiser URL, a blank design, and Save Design again.
  await expect(page).toHaveURL(CUSTOMISER_PATH);
  expect(page.url()).not.toContain("design=");
  await expect(page.getByRole("button", { name: "Save Design", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Update Design", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New Design", exact: true })).toHaveCount(0);
  await expect(colourGroup(page, "Vamp").getByRole("radio", { checked: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Next part", exact: true }).click();
  await expect(colourGroup(page, "Quarter").getByRole("radio", { checked: true })).toHaveCount(0);
  // The draft no longer carries the saved design's colours.
  expect(await page.evaluate(() => window.localStorage.getItem("cs-customization"))).not.toContain('"vamp":"red"');

  // Nothing was saved, updated, deleted or added to the Bag.
  expect(designWrites.post).toHaveLength(0);
  expect(designWrites.patch).toHaveLength(0);
  expect(designWrites.delete).toHaveLength(0);
  expect(bagAdds).toHaveLength(0);

  // The saved design is still there, unchanged: Back reopens it in its own colours (the part
  // picker stays on Quarter, where the new design left it; the saved design's quarter is Black).
  await page.goBack();
  await expect(page).toHaveURL(`${CUSTOMISER_PATH}?design=${DESIGN_ID}`);
  await expect(page.getByRole("button", { name: "Update Design", exact: true })).toBeVisible();
  await expect(colourGroup(page, "Quarter").getByRole("radio", { name: "Black", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Previous part", exact: true }).click();
  await expect(colourGroup(page, "Vamp").getByRole("radio", { name: "Red", exact: true })).toBeChecked();
});

test("after New Design, saving creates a separate design with only the new colours", async ({ page, supabase }) => {
  const fresh = designRow({ id: OTHER_DESIGN_ID, name: "Nike Air Force · new", customization: { vamp: "white" } });
  supabase.mock({ method: "GET", path: DESIGNS_PATH, json: [RED_DESIGN] });
  supabase.mock({ method: "POST", path: DESIGNS_PATH, status: 201, json: fresh });
  const patches = recordDesignRequests(page, "PATCH");

  await page.goto(`${CUSTOMISER_PATH}?design=${DESIGN_ID}`);
  await expect(page.getByRole("button", { name: "Update Design", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New Design", exact: true }).click();
  await expect(page).toHaveURL(CUSTOMISER_PATH);

  await colourGroup(page, "Vamp").getByRole("radio", { name: "White", exact: true }).click();
  const insert = page.waitForRequest(isTableRequest("POST", DESIGNS_PATH));
  await page.getByRole("button", { name: "Save Design", exact: true }).click();
  // Only the new design's colours: nothing from the saved design (its Black quarter) came along.
  expect((await insert).postDataJSON().customization).toEqual({ vamp: "white" });
  await expect(page).toHaveURL(`${CUSTOMISER_PATH}?design=${OTHER_DESIGN_ID}`);
  expect(patches).toHaveLength(0);
});

test("New Design appears only while a saved design is open", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: DESIGNS_PATH, json: [] });

  // A new design: no New Design.
  await page.goto(CUSTOMISER_PATH);
  await expect(page.getByRole("button", { name: "Save Design", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "New Design", exact: true })).toHaveCount(0);

  // A saved design that can't be found opens as a new design: no New Design either.
  await page.goto(`${CUSTOMISER_PATH}?design=${DESIGN_ID}`);
  await expect(page.getByRole("alert").filter({ hasText: "couldn’t be found" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New Design", exact: true })).toHaveCount(0);
});

test("a second Save Design while the URL is catching up doesn't save a duplicate", async ({ page, supabase }) => {
  const name = "Nike Air Force · saved";
  const saved = designRow({ id: DESIGN_ID, name, customization: { vamp: "red" } });
  supabase.mock({ method: "POST", path: DESIGNS_PATH, status: 201, json: saved });
  supabase.mock({ method: "GET", path: DESIGNS_PATH, json: [saved] });
  supabase.mock({ method: "GET", path: "/rest/v1/products", json: [PRODUCT_ROW] });
  supabase.mock({ method: "DELETE", path: DESIGNS_PATH, status: 204 });
  const posts = recordDesignRequests(page, "POST");

  // Hold the customiser's navigation to ?design=<id> (Next fetches the route before the URL
  // changes) until the test lets it go: the gap between a successful save and the URL.
  let releaseNavigation = () => {};
  const navigationReleased = new Promise<void>((resolve) => {
    releaseNavigation = resolve;
  });
  let navigationHeld = () => {};
  const navigationStarted = new Promise<void>((resolve) => {
    navigationHeld = resolve;
  });
  await page.route(
    (url) => url.pathname === CUSTOMISER_PATH && url.searchParams.get("design") === DESIGN_ID,
    async (route) => {
      navigationHeld();
      await navigationReleased;
      // Not answered here: on to the app server, as any app request.
      await route.fallback();
    },
  );

  await page.goto(CUSTOMISER_PATH);
  await colourGroup(page, "Vamp").getByRole("radio", { name: "Red", exact: true }).click();
  await page.getByRole("button", { name: "Save Design", exact: true }).click();

  // Saved, and the navigation to the saved design has started but not finished.
  await navigationStarted;
  await expect(page.getByRole("status").filter({ hasText: "Design saved." })).toBeVisible();
  expect(page.url()).not.toContain("design=");
  // In the gap the just-saved design is the open one, and saving is off.
  const saveButton = page.getByRole("button", { name: /^(Save|Update) Design$/ });
  await expect(saveButton).toHaveText("Update Design");
  await expect(saveButton).toBeDisabled();
  // A second press now (forced past the disabled state, as a fast tap would land) saves nothing.
  await saveButton.click({ force: true });
  await expect(page.getByRole("button", { name: "Save Design", exact: true })).toHaveCount(0);
  expect(posts).toHaveLength(1);

  // The URL catches up: the saved design is open and Update Design works as usual.
  releaseNavigation();
  await expect(page).toHaveURL(`${CUSTOMISER_PATH}?design=${DESIGN_ID}`);
  await expect(page.getByRole("button", { name: "Update Design", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "New Design", exact: true })).toBeEnabled();
  expect(posts).toHaveLength(1);

  // Clean up: delete the design this test saved.
  await page.goto("/designs");
  await designCard(page, name).getByRole("button", { name: `Delete ${name}`, exact: true }).click();
  const removal = page.waitForRequest(isTableRequest("DELETE", DESIGNS_PATH));
  await page.getByRole("dialog", { name: "Delete this design?", exact: true }).getByRole("button", { name: "Delete", exact: true }).click();
  expect(new URL((await removal).url()).searchParams.get("id")).toBe(`eq.${DESIGN_ID}`);
  await expect(page.getByRole("status").filter({ hasText: "Design deleted." })).toBeVisible();
});
