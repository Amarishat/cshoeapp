import { expect, MOCK_GUEST_USER_ID, test, type Page, type SupabaseMocks } from "../support/mocked-test";

/*
 * Checkout · Address and Checkout · Order Summary for a guest with one selected, customised Bag
 * item: choosing a saved address, the summary it leads to, and the checks that keep an invalid
 * address out of checkout.
 *
 * Every Supabase request is answered by a mock with synthetic data (no real catalogue, Bag or
 * addresses), so nothing is ever written to a real backend. Saving an address is answered only where
 * a test mocks that write; any other write the app attempted would have no mock, so the fixture would
 * block it and fail the test.
 */

const PRODUCT_ID = "nike-air-force";
/** The product's price in rupees; the Bag catalogue takes it from the customiser's product. */
const PRICE = 9999;
const QUANTITY = 1;
/** lib/pricing.ts: DELIVERY_FEE (1250) + PLATFORM_FEE (9), added once per order. */
const DELIVERY_AND_PLATFORM_FEES = 1250 + 9;
const EXPECTED_TOTAL = PRICE * QUANTITY + DELIVERY_AND_PLATFORM_FEES;
/** Order Summary's "Total Amount" (formatAmount in lib/pricing.ts: ₹ with two decimals, en-IN). */
const EXPECTED_TOTAL_AMOUNT = `₹${EXPECTED_TOTAL.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Fake ids. None of them is a real row. */
const CART_ITEM_ID = "00000000-0000-4000-8000-0000000ca273";
const ADDRESS_A_ID = "00000000-0000-4000-8000-0000000add0a";
const ADDRESS_B_ID = "00000000-0000-4000-8000-0000000add0b";
const INVALID_ADDRESS_ID = "00000000-0000-4000-8000-0000000add0c";

/** One products row in the shape getProducts() selects: customisable, no product page of its own. */
const PRODUCT_ROW = {
  id: PRODUCT_ID,
  slug: PRODUCT_ID,
  brand_id: "nike",
  name: "Nike Air Force",
  short_name: null,
  category: "Men's Shoes",
  audience: "men",
  price: PRICE,
  discount_label: null,
  rating: 4.5,
  description_excerpt: null,
  description_rest: null,
  details: null,
  card_image: { src: "/images/customizer/bag.svg", box: [0, 0, 100, 100] },
  cutout_url: null,
  cutout_frame: null,
  // No product page, so the Bag catalogue reads no product details — only the customiser.
  has_product_page: false,
  is_customizable: true,
  home_sections: [],
  created_at: "2026-01-01T00:00:00Z",
  brand: { id: "nike", name: "Nike" },
};

/** The customiser for that product (getCustomizationConfig()), with the shoe image the Bag needs. */
const CONFIG_ROW = {
  product_id: PRODUCT_ID,
  title: "Nike Air Force",
  display_category: "Men's Shoes",
  wordmark: "NIKE",
  image_url: "/images/customizer/bag.svg",
  angles: [{ src: "/images/customizer/bag.svg", alt: "", frame: [0, 0, 100, 100], size: [100, 100], rotate: 0 }],
  product: {
    slug: PRODUCT_ID,
    price: PRICE,
    discount_label: null,
    is_customizable: true,
    product_sizes: [{ size_uk: 8, is_default: true, sort_order: 0 }],
  },
  customization_parts: [{ id: "vamp", name: "Vamp", sort_order: 0 }],
  customization_colours: [{ id: "black", name: "Black", hex: "#1A1A1A", sort_order: 0 }],
};

/** One selected, customised Bag row (listCart()): CheckoutGuard needs a selected item. */
const CART_ROW = {
  id: CART_ITEM_ID,
  product_id: PRODUCT_ID,
  size_uk: 8,
  quantity: QUANTITY,
  is_selected: true,
  customization: { vamp: "black" },
  created_at: "2026-01-01T00:00:00Z",
};

/** An addresses row in the shape listAddresses() selects (contact and street details overridable). */
function addressRow(fields: {
  id: string;
  full_name: string;
  state: string;
  is_default: boolean;
  created_at: string;
  phone?: string;
  pincode?: string;
  city?: string;
  area?: string;
  street?: string;
  type?: "home" | "office" | "other";
}) {
  return {
    user_id: "00000000-0000-4000-8000-00000000e2e0",
    phone: "9876543210",
    pincode: "560001",
    city: "Bengaluru",
    area: "MG Road",
    street: "1 Test Street",
    type: "home",
    ...fields,
  };
}

/** Two valid addresses, A (the default) listed first (listAddresses() orders by created_at). */
const ADDRESS_A = addressRow({
  id: ADDRESS_A_ID,
  full_name: "Asha Rao",
  state: "Karnataka",
  is_default: true,
  created_at: "2026-01-01T00:00:00Z",
});
const ADDRESS_B = addressRow({
  id: ADDRESS_B_ID,
  full_name: "Bala Iyer",
  state: "Tamil Nadu",
  is_default: false,
  created_at: "2026-01-02T00:00:00Z",
});
/**
 * A saved address the app's validation refuses: its state isn't one of India's states/UTs
 * (lib/validation/address.ts). The database only requires a non-blank state, so such a row can exist.
 */
const INVALID_ADDRESS = addressRow({
  id: INVALID_ADDRESS_ID,
  full_name: "Chitra Nair",
  state: "Not A State",
  is_default: true,
  created_at: "2026-01-03T00:00:00Z",
});

/** The id the database would give the new address the save tests add. */
const NEW_ID = "00000000-0000-4000-8000-0000000add0d";
/** That new address as listAddresses() reads it back once saved: Office, not the default. */
const NEW_ADDRESS = addressRow({
  id: NEW_ID,
  full_name: "Divya Menon",
  phone: "9123456780",
  pincode: "682001",
  state: "Kerala",
  city: "Kochi",
  area: "Fort Kochi",
  street: "2 Synthetic Lane",
  type: "office",
  is_default: false,
  created_at: "2026-01-04T00:00:00Z",
});
/** createAddress()'s insert for it: the trimmed form, for the guest, not the default. */
const NEW_ADDRESS_INSERT = {
  full_name: "Divya Menon",
  phone: "9123456780",
  pincode: "682001",
  state: "Kerala",
  city: "Kochi",
  area: "Fort Kochi",
  street: "2 Synthetic Lane",
  type: "office",
  user_id: MOCK_GUEST_USER_ID,
  is_default: false,
};

/** A saved address card on Checkout · Address (AddressCard: "Deliver to <full name>, …"). */
function addressCard(page: Page, fullName: string) {
  return page
    .getByRole("radiogroup", { name: "Saved addresses", exact: true })
    .getByRole("radio", { name: new RegExp(`^Deliver to ${fullName},`) });
}

/** The "Type of address" option for Office in the address form. */
function officeOption(page: Page) {
  return page
    .getByRole("radiogroup", { name: "Type of address", exact: true })
    .getByRole("radio", { name: "Office", exact: true });
}

/** Types the new address into the form (Office, default left unticked). The name's spaces are trimmed on save. */
async function fillNewAddress(page: Page) {
  await page.getByLabel("Full Name", { exact: true }).fill(" Divya Menon ");
  await page.getByLabel("Phone Number", { exact: true }).fill("9123456780");
  await page.getByLabel("Pincode", { exact: true }).fill("682001");
  // By value: the select's hidden, disabled placeholder option is also labelled "Kerala".
  await page.getByLabel("State", { exact: true }).selectOption({ value: "Kerala" });
  await page.getByLabel("City", { exact: true }).fill("Kochi");
  await page.getByLabel("Area", { exact: true }).fill("Fort Kochi");
  await page.getByLabel("Street Address", { exact: true }).fill("2 Synthetic Lane");
  await officeOption(page).click();
  await expect(page.getByRole("checkbox", { name: "Make as default address", exact: true })).toHaveAttribute(
    "aria-checked",
    "false",
  );
}

/** Resolves with the next address insert (POST /rest/v1/addresses) the page sends. */
function nextAddressInsert(page: Page) {
  return page.waitForRequest(
    (request) => request.method() === "POST" && new URL(request.url()).pathname === "/rest/v1/addresses",
  );
}

/**
 * Records every address write (POST / PATCH / PUT / DELETE to /rest/v1/addresses) the page sends, in
 * order: method, query parameters as [name, value] pairs, and the parsed body.
 */
function recordAddressWrites(page: Page) {
  const writes: { method: string; query: [string, string][]; body: unknown }[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname !== "/rest/v1/addresses" || !["POST", "PATCH", "PUT", "DELETE"].includes(request.method())) return;
    writes.push({ method: request.method(), query: [...url.searchParams], body: request.postDataJSON() });
  });
  return writes;
}

/** Redacted address inserts, and any updates or deletions, answered so far. */
function addressWrites(supabase: SupabaseMocks) {
  const handled = supabase.handled;
  return {
    inserts: handled.filter((entry) => entry.startsWith("POST local Supabase /rest/v1/addresses")),
    updatesAndDeletes: handled.filter((entry) => entry.startsWith("PATCH ") || entry.startsWith("DELETE ")),
  };
}

test.beforeEach(({ supabase }) => {
  // Read on every checkout page: the Bag (CheckoutGuard, totals) and its catalogue — products,
  // then the customiser of each customisable product (lib/data/bagCatalogue.ts).
  supabase.mock({ method: "GET", path: "/rest/v1/cart_items", json: [CART_ROW] });
  supabase.mock({ method: "GET", path: "/rest/v1/products", json: [PRODUCT_ROW] });
  supabase.mock({ method: "GET", path: "/rest/v1/customization_configs", json: [CONFIG_ROW] });
});

test("choosing a saved address continues to an order summary for it, then to payment", async ({ page, supabase }) => {
  // listAddresses(): read by Address, Order Summary and Payment.
  supabase.mock({ method: "GET", path: "/rest/v1/addresses", json: [ADDRESS_A, ADDRESS_B] });

  // No chosen address on the device: the default one (A) is selected once the addresses load.
  await page.goto("/checkout/address");
  await expect(addressCard(page, "Asha Rao")).toHaveAttribute("aria-checked", "true");
  await expect(addressCard(page, "Bala Iyer")).toHaveAttribute("aria-checked", "false");

  await addressCard(page, "Bala Iyer").click();
  await expect(addressCard(page, "Bala Iyer")).toHaveAttribute("aria-checked", "true");
  await expect(addressCard(page, "Asha Rao")).toHaveAttribute("aria-checked", "false");

  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout\/order-summary$/);

  // The summary delivers to B, lists the Bag item and totals it with the fixed fees.
  const deliverTo = page.getByRole("region", { name: "Deliver to:", exact: true });
  await expect(deliverTo).toContainText("Bala Iyer");
  await expect(deliverTo).toContainText("1 Test Street, Bengaluru, Tamil Nadu");
  await expect(deliverTo).not.toContainText("Asha Rao");
  await expect(page.getByRole("list", { name: "Items in this order", exact: true })).toContainText("Nike Air Force");
  const priceDetails = page.locator("#price-details");
  await expect(priceDetails.getByText("Total Amount", { exact: true })).toBeVisible();
  await expect(priceDetails.getByText(EXPECTED_TOTAL_AMOUNT, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout\/payment$/);
  // Payment accepted the chosen address (it would send an invalid one back to the Address step).
  await expect(page.getByRole("radiogroup", { name: "UPI app", exact: true })).toBeVisible();
});

test("an invalid saved address can't continue, and Order Summary sends it back to Address", async ({
  page,
  supabase,
}) => {
  supabase.mock({ method: "GET", path: "/rest/v1/addresses", json: [INVALID_ADDRESS] });
  // The chosen address on the device (lib/store/checkout.ts: zustand persist "cs-checkout",
  // version 1, only selectedAddressId), planted before the app loads.
  await page.addInitScript(
    ({ value }) => {
      try {
        window.localStorage.setItem("cs-checkout", value);
      } catch {
        // Storage unavailable (e.g. about:blank): nothing to plant.
      }
    },
    { value: JSON.stringify({ state: { selectedAddressId: INVALID_ADDRESS_ID }, version: 1 }) },
  );

  // It is listed and selected, but Continue stays disabled.
  await page.goto("/checkout/address");
  await expect(addressCard(page, "Chitra Nair")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();

  // Opening Order Summary directly with it sends the customer back to choose an address.
  await page.goto("/checkout/order-summary");
  await expect(page).toHaveURL(/\/checkout\/address$/);
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
});

test("saving an empty address form shows each field's error and saves nothing", async ({ page, supabase }) => {
  // No saved addresses yet: only the "Add Shipping Address" form.
  supabase.mock({ method: "GET", path: "/rest/v1/addresses", json: [] });

  await page.goto("/checkout/address");
  await expect(page.getByRole("heading", { name: "Add Shipping Address", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "SAVE", exact: true }).click();

  // validateAddress() (lib/validation/address.ts): every required field reports its own error.
  const expectedErrors = [
    { label: "Full Name", message: "Enter your full name" },
    { label: "Phone Number", message: "Enter your phone number" },
    { label: "Pincode", message: "Enter pincode" },
    { label: "State", message: "Select state" },
    { label: "City", message: "Enter city" },
    { label: "Area", message: "Enter area" },
    { label: "Street Address", message: "Enter street address" },
  ];
  for (const { label, message } of expectedErrors) {
    const field = page.getByLabel(label, { exact: true });
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAccessibleDescription(message);
  }
  // Focus moves to the first field with an error.
  await expect(page.getByLabel("Full Name", { exact: true })).toBeFocused();

  // Nothing was saved, and Continue still has no address to continue with. A POST /addresses
  // (or any other write) has no mock here, so the fixture would also fail the test at teardown.
  await expect(page.getByText("Address saved", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
  expect(supabase.handled.filter((entry) => !entry.startsWith("GET "))).toEqual([]);
});

test("Saving a valid new address selects it, saves it once, and the summary delivers to it", async ({
  page,
  supabase,
}) => {
  // One saved address to start with: A, the default.
  supabase.mock({ method: "GET", path: "/rest/v1/addresses", json: [ADDRESS_A] });

  await page.goto("/checkout/address");
  await expect(addressCard(page, "Asha Rao")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("heading", { name: "Add Shipping Address", exact: true })).toBeVisible();

  // Fill in a new, valid address: Office, not the default.
  await fillNewAddress(page);

  // What the database would return (registered now; the latest matching mock wins): createAddress()
  // inserts with .select("id").single(), so the reply is one object; then the list is read again.
  supabase.mock({ method: "POST", path: "/rest/v1/addresses", json: { id: NEW_ID } });
  supabase.mock({ method: "GET", path: "/rest/v1/addresses", json: [ADDRESS_A, NEW_ADDRESS] });

  const insert = nextAddressInsert(page);
  await page.getByRole("button", { name: "SAVE", exact: true }).click();

  // createAddress(): the trimmed form, for the guest, not the default; only its new id comes back.
  const request = await insert;
  expect(new URL(request.url()).searchParams.get("select")).toBe("id");
  expect(request.postDataJSON()).toEqual(NEW_ADDRESS_INSERT);

  // Saved: the new address is selected instead of A, and the form is ready for another one.
  await expect(page.getByRole("status").filter({ hasText: "Address saved" })).toHaveText("Address saved");
  await expect(addressCard(page, "Divya Menon")).toHaveAccessibleName(/^Deliver to Divya Menon, Office: /);
  await expect(addressCard(page, "Divya Menon")).toHaveAttribute("aria-checked", "true");
  await expect(addressCard(page, "Asha Rao")).toHaveAttribute("aria-checked", "false");
  await expect(page.getByLabel("Full Name", { exact: true })).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Add Shipping Address", exact: true })).toBeVisible();
  const continueButton = page.getByRole("button", { name: "Continue", exact: true });
  await expect(continueButton).toBeEnabled();

  // Saved exactly once, with no default-address updates (PATCH) or deletions.
  const writes = addressWrites(supabase);
  expect(writes.inserts).toHaveLength(1);
  expect(writes.updatesAndDeletes).toEqual([]);

  // The summary delivers to the new address.
  await continueButton.click();
  await expect(page).toHaveURL(/\/checkout\/order-summary$/);
  const deliverTo = page.getByRole("region", { name: "Deliver to:", exact: true });
  await expect(deliverTo).toContainText("Divya Menon");
  await expect(deliverTo).toContainText("Office");
  await expect(deliverTo).toContainText("2 Synthetic Lane, Kochi, Kerala");
  await expect(deliverTo).not.toContainText("Asha Rao");
});

test("a failed save keeps the typed address, and retrying saves it once", async ({ page, supabase }) => {
  // One saved address to start with: A, the default.
  supabase.mock({ method: "GET", path: "/rest/v1/addresses", json: [ADDRESS_A] });

  await page.goto("/checkout/address");
  await expect(addressCard(page, "Asha Rao")).toHaveAttribute("aria-checked", "true");
  await fillNewAddress(page);

  // A temporary failure. POST requests aren't retried by postgrest-js, so this fails once, and
  // createAddress() throws before any default-address update or list reload.
  supabase.mock({
    method: "POST",
    path: "/rest/v1/addresses",
    status: 500,
    json: { code: "XX000", message: "synthetic: temporary failure", details: null, hint: null },
  });

  const save = page.getByRole("button", { name: "SAVE", exact: true });
  const firstAttempt = nextAddressInsert(page);
  await save.click();
  expect((await firstAttempt).postDataJSON()).toEqual(NEW_ADDRESS_INSERT);

  // The failure is announced (AddressError's message) and nothing is reported as saved.
  const failure = page.getByRole("alert").filter({ hasText: "Could not save the address" });
  await expect(failure).toHaveText("Could not save the address: synthetic: temporary failure");
  await expect(page.getByRole("status").filter({ hasText: "Address saved" })).toHaveCount(0);
  await expect(save).toBeEnabled();

  // The form keeps exactly what was typed (the name untrimmed: only the insert is trimmed), with no
  // field errors, ready to retry.
  const fields = [
    { label: "Full Name", value: " Divya Menon " },
    { label: "Phone Number", value: "9123456780" },
    { label: "Pincode", value: "682001" },
    { label: "State", value: "Kerala" },
    { label: "City", value: "Kochi" },
    { label: "Area", value: "Fort Kochi" },
    { label: "Street Address", value: "2 Synthetic Lane" },
  ];
  for (const { label, value } of fields) {
    const field = page.getByLabel(label, { exact: true });
    await expect(field).toHaveValue(value);
    await expect(field).not.toHaveAttribute("aria-invalid", "true");
  }
  await expect(officeOption(page)).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("checkbox", { name: "Make as default address", exact: true })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await expect(page.getByRole("heading", { name: "Add Shipping Address", exact: true })).toBeVisible();

  // No new address appeared and A is still the selected one.
  await expect(addressCard(page, "Divya Menon")).toHaveCount(0);
  await expect(addressCard(page, "Asha Rao")).toHaveAttribute("aria-checked", "true");

  // The failed attempt sent one insert and nothing else.
  const afterFailure = addressWrites(supabase);
  expect(afterFailure.inserts).toHaveLength(1);
  expect(afterFailure.updatesAndDeletes).toEqual([]);

  // Retry: this time the insert succeeds (the latest matching mock wins) and the list is read again.
  supabase.mock({ method: "POST", path: "/rest/v1/addresses", json: { id: NEW_ID } });
  supabase.mock({ method: "GET", path: "/rest/v1/addresses", json: [ADDRESS_A, NEW_ADDRESS] });

  const retry = nextAddressInsert(page);
  await save.click();
  const retryRequest = await retry;
  expect(new URL(retryRequest.url()).searchParams.get("select")).toBe("id");
  expect(retryRequest.postDataJSON()).toEqual(NEW_ADDRESS_INSERT);

  // Saved: the error is gone, the new address is selected instead of A, and the form is reset.
  await expect(page.getByRole("status").filter({ hasText: "Address saved" })).toHaveText("Address saved");
  await expect(failure).toHaveCount(0);
  await expect(addressCard(page, "Divya Menon")).toHaveAttribute("aria-checked", "true");
  await expect(addressCard(page, "Asha Rao")).toHaveAttribute("aria-checked", "false");
  await expect(page.getByLabel("Full Name", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeEnabled();

  // Two inserts in all (the failure and the retry), with no default-address updates or deletions.
  const writes = addressWrites(supabase);
  expect(writes.inserts).toHaveLength(2);
  expect(writes.updatesAndDeletes).toEqual([]);
});

test("saving a new address as the default clears the old default, then makes the new one the default", async ({
  page,
  supabase,
}) => {
  // One saved address to start with: A, the default (and so the selected one).
  supabase.mock({ method: "GET", path: "/rest/v1/addresses", json: [ADDRESS_A] });

  await page.goto("/checkout/address");
  await expect(addressCard(page, "Asha Rao")).toHaveAttribute("aria-checked", "true");

  await fillNewAddress(page);
  const makeDefault = page.getByRole("checkbox", { name: "Make as default address", exact: true });
  await makeDefault.click();
  await expect(makeDefault).toHaveAttribute("aria-checked", "true");

  // createAddress(): the insert (always not the default), then clearDefault() and setDefault(), each
  // only once the previous request has finished. The PATCH mocks match only their exact filters, so
  // any other update would be blocked and fail the test. Neither update returns rows (204).
  supabase.mock({ method: "POST", path: "/rest/v1/addresses", json: { id: NEW_ID } });
  supabase.mock({
    method: "PATCH",
    path: "/rest/v1/addresses",
    match: (url) =>
      [...url.searchParams].length === 3 &&
      url.searchParams.get("user_id") === `eq.${MOCK_GUEST_USER_ID}` &&
      url.searchParams.get("is_default") === "eq.true" &&
      url.searchParams.get("id") === `neq.${NEW_ID}`,
    status: 204,
  });
  supabase.mock({
    method: "PATCH",
    path: "/rest/v1/addresses",
    match: (url) =>
      [...url.searchParams].length === 2 &&
      url.searchParams.get("user_id") === `eq.${MOCK_GUEST_USER_ID}` &&
      url.searchParams.get("id") === `eq.${NEW_ID}`,
    status: 204,
  });
  // Then the list is read again: the default has moved from A to the new address.
  supabase.mock({
    method: "GET",
    path: "/rest/v1/addresses",
    json: [
      { ...ADDRESS_A, is_default: false },
      { ...NEW_ADDRESS, is_default: true },
    ],
  });

  const writes = recordAddressWrites(page);
  await page.getByRole("button", { name: "SAVE", exact: true }).click();

  // "Address saved" is shown only after the list is reloaded, so every write has been sent by now.
  await expect(page.getByRole("status").filter({ hasText: "Address saved" })).toHaveText("Address saved");
  const expectedWrites = [
    { method: "POST", query: [["select", "id"]], body: NEW_ADDRESS_INSERT },
    {
      method: "PATCH",
      query: [
        ["user_id", `eq.${MOCK_GUEST_USER_ID}`],
        ["is_default", "eq.true"],
        ["id", `neq.${NEW_ID}`],
      ],
      body: { is_default: false },
    },
    {
      method: "PATCH",
      query: [
        ["user_id", `eq.${MOCK_GUEST_USER_ID}`],
        ["id", `eq.${NEW_ID}`],
      ],
      body: { is_default: true },
    },
  ];
  expect(writes).toEqual(expectedWrites);

  // The fixture answered exactly those: one insert, two updates, no deletions.
  const handled = supabase.handled;
  expect(handled.filter((entry) => entry.startsWith("POST local Supabase /rest/v1/addresses"))).toHaveLength(1);
  expect(handled.filter((entry) => entry.startsWith("PATCH local Supabase /rest/v1/addresses"))).toHaveLength(2);
  expect(handled.filter((entry) => entry.startsWith("PATCH ") || entry.startsWith("DELETE "))).toHaveLength(2);

  // Saved: no save error in the form (scoped to it: Next's route announcer is a page-wide, empty
  // role="alert"), the new address is selected instead of A, and the form is ready for another one.
  const form = page.getByRole("region", { name: "Add Shipping Address", exact: true });
  await expect(form).toBeVisible();
  await expect(form.getByRole("alert")).toHaveCount(0);
  await expect(addressCard(page, "Divya Menon")).toHaveAttribute("aria-checked", "true");
  await expect(addressCard(page, "Asha Rao")).toHaveAttribute("aria-checked", "false");
  await expect(page.getByLabel("Full Name", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeEnabled();

  // The cards don't show which address is the default; editing one loads it into the form, default included.
  await page.getByRole("button", { name: "Edit address for Divya Menon", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Edit Shipping Address", exact: true })).toBeVisible();
  await expect(page.getByLabel("Full Name", { exact: true })).toHaveValue("Divya Menon");
  await expect(makeDefault).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: "Edit address for Asha Rao", exact: true }).click();
  await expect(page.getByLabel("Full Name", { exact: true })).toHaveValue("Asha Rao");
  await expect(makeDefault).toHaveAttribute("aria-checked", "false");

  // Opening the edit form writes nothing.
  expect(writes).toEqual(expectedWrites);
  expect(supabase.handled.filter((entry) => !entry.startsWith("GET "))).toEqual(
    handled.filter((entry) => !entry.startsWith("GET ")),
  );
});
