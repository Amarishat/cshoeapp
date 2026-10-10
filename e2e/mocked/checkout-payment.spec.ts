import { expect, test, type Page, type Request, type SupabaseMocks } from "../support/mocked-test";

/*
 * Checkout · Payment for a guest with one selected, customised Bag item. Paying is simulated: after
 * PaymentView's processing delay the app calls the database function place_order() with the total
 * it showed, and Payment Success then reads the new order back.
 *
 * Every Supabase request is answered by a mock with synthetic data (no real catalogue, Bag, address
 * or order). place_order() is mocked too — nothing is ordered; only its request body is checked.
 * The database's own checks (pricing, address ownership, removing the ordered Bag rows) are not
 * exercised here.
 */

const PRODUCT_ID = "nike-air-force";
/** The product's price in rupees; the Bag catalogue takes it from the customiser's product. */
const PRICE = 9999;
const QUANTITY = 1;
/** lib/pricing.ts: DELIVERY_FEE (1250) + PLATFORM_FEE (9), added once per order. */
const DELIVERY_AND_PLATFORM_FEES = 1250 + 9;
/** What place_order() must be told: the total the payment screen shows. */
const EXPECTED_TOTAL = PRICE * QUANTITY + DELIVERY_AND_PLATFORM_FEES;

/** Fake ids and order number. None of them is a real row. */
const ADDRESS_ID = "00000000-0000-4000-8000-0000000add01";
const CART_ITEM_ID = "00000000-0000-4000-8000-0000000ca272";
const ORDER_NUMBER = "OD99999990001";

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

/** One selected, customised Bag row (listCart()). */
const CART_ROW = {
  id: CART_ITEM_ID,
  product_id: PRODUCT_ID,
  size_uk: 8,
  quantity: QUANTITY,
  is_selected: true,
  customization: { vamp: "black" },
  created_at: "2026-01-01T00:00:00Z",
};

/** One saved address (listAddresses()) that passes the app's address validation. */
const ADDRESS_ROW = {
  id: ADDRESS_ID,
  user_id: "00000000-0000-4000-8000-00000000e2e0",
  full_name: "Test Guest",
  phone: "9876543210",
  pincode: "560001",
  state: "Karnataka",
  city: "Bengaluru",
  area: "MG Road",
  street: "1 Test Street",
  type: "home",
  is_default: true,
  created_at: "2026-01-01T00:00:00Z",
};

/** The order place_order() created, as getOrderByNumber() selects it (ORDER_COLUMNS). */
const ORDER_ROW = {
  id: "00000000-0000-4000-8000-0000000003d1",
  order_number: ORDER_NUMBER,
  created_at: "2026-10-03T10:00:00Z",
  status: "confirmed",
  cancelled_at: null,
  shipped_at: null,
  out_for_delivery_at: null,
  delivered_at: null,
  address_id: ADDRESS_ID,
  ship_full_name: ADDRESS_ROW.full_name,
  ship_phone: ADDRESS_ROW.phone,
  ship_pincode: ADDRESS_ROW.pincode,
  ship_state: ADDRESS_ROW.state,
  ship_city: ADDRESS_ROW.city,
  ship_area: ADDRESS_ROW.area,
  ship_street: ADDRESS_ROW.street,
  ship_type: ADDRESS_ROW.type,
  payment_method: "upi",
  upi_app: "phonepe",
  subtotal: PRICE * QUANTITY,
  discount: 0,
  delivery_fee: 1250,
  platform_fee: 9,
  total: EXPECTED_TOTAL,
  amount_paid: EXPECTED_TOTAL,
  order_items: [
    {
      id: "00000000-0000-4000-8000-0000000003e1",
      product_id: PRODUCT_ID,
      product_name: "Nike Air Force",
      product_category: "Men's Shoes",
      image_url: "/images/customizer/bag.svg",
      image_fit: "contain",
      size_uk: 8,
      quantity: QUANTITY,
      unit_price: PRICE,
      is_customized: true,
      order_item_customizations: [{ part_id: "vamp", part_name: "Vamp", colour_id: "black", colour_name: "Black" }],
    },
  ],
};

test("paying sends the shown total to place_order and shows the new order", async ({ page, supabase }) => {
  // The chosen delivery address (lib/store/checkout.ts: zustand persist "cs-checkout", version 1,
  // only selectedAddressId), planted before the app loads.
  await page.addInitScript(
    ({ value }) => {
      try {
        window.localStorage.setItem("cs-checkout", value);
      } catch {
        // Storage unavailable (e.g. about:blank): nothing to plant.
      }
    },
    { value: JSON.stringify({ state: { selectedAddressId: ADDRESS_ID }, version: 1 }) },
  );

  // The Bag (CheckoutGuard needs a selected item), read on every customer page.
  supabase.mock({ method: "GET", path: "/rest/v1/cart_items", json: [CART_ROW] });
  // Payment's loadBagCatalogue(): products, then the customiser of each customisable product.
  supabase.mock({ method: "GET", path: "/rest/v1/products", json: [PRODUCT_ROW] });
  supabase.mock({ method: "GET", path: "/rest/v1/customization_configs", json: [CONFIG_ROW] });
  // Payment's listAddresses().
  supabase.mock({ method: "GET", path: "/rest/v1/addresses", json: [ADDRESS_ROW] });
  // The simulated payment's order: place_order() returns the new order number.
  supabase.mock({ method: "POST", path: "/rest/v1/rpc/place_order", json: ORDER_NUMBER });
  // Payment Success reads the order back (getOrderByNumber()).
  supabase.mock({ method: "GET", path: "/rest/v1/orders", json: [ORDER_ROW] });

  await page.goto("/checkout/payment");

  // Choose a UPI app other than the default (Google Pay), then pay with it.
  const upiApps = page.getByRole("radiogroup", { name: "UPI app", exact: true });
  await upiApps.getByRole("radio", { name: "PhonePe", exact: true }).click();
  await expect(upiApps.getByRole("radio", { name: "PhonePe", exact: true })).toHaveAttribute("aria-checked", "true");

  const placeOrder = page.waitForRequest(
    (request) => request.method() === "POST" && new URL(request.url()).pathname === "/rest/v1/rpc/place_order",
  );
  await page.getByRole("button", { name: "Pay using PhonePe", exact: true }).click();
  // The simulated payment (PaymentView's 1.8s PROCESSING_MS, in real time) shows first.
  await expect(page.getByText("Processing payment…", { exact: true })).toBeVisible();

  // place_order() gets the chosen address and UPI app and the total that was shown.
  expect((await placeOrder).postDataJSON()).toEqual({
    p_address_id: ADDRESS_ID,
    p_upi_app: "phonepe",
    p_expected_total: EXPECTED_TOTAL,
  });

  // Payment Success shows the order the database returned. The longer timeout covers the first
  // compile of /payment-success on the dev server.
  await expect(page).toHaveURL(new RegExp(`/payment-success\\?order=${ORDER_NUMBER}$`), { timeout: 15_000 });
  await expect(page.getByRole("status").filter({ hasText: "Payment Successful" })).toBeVisible();
  await expect(page.getByText(ORDER_NUMBER, { exact: true })).toBeVisible();
  await expect(page.getByText(`₹${EXPECTED_TOTAL.toLocaleString("en-IN")}`, { exact: true })).toBeVisible();
  await expect(page.getByText("Arriving by", { exact: true })).toBeVisible();
});

/**
 * The payment screen's setup, as in the test above: the chosen address planted on the device and
 * the reads Payment makes (Bag, its catalogue, the addresses). place_order() is mocked by each test.
 */
async function setUpPayment(page: Page, supabase: SupabaseMocks) {
  await page.addInitScript(
    ({ value }) => {
      try {
        window.localStorage.setItem("cs-checkout", value);
      } catch {
        // Storage unavailable (e.g. about:blank): nothing to plant.
      }
    },
    { value: JSON.stringify({ state: { selectedAddressId: ADDRESS_ID }, version: 1 }) },
  );
  supabase.mock({ method: "GET", path: "/rest/v1/cart_items", json: [CART_ROW] });
  supabase.mock({ method: "GET", path: "/rest/v1/products", json: [PRODUCT_ROW] });
  supabase.mock({ method: "GET", path: "/rest/v1/customization_configs", json: [CONFIG_ROW] });
  supabase.mock({ method: "GET", path: "/rest/v1/addresses", json: [ADDRESS_ROW] });
}

/** The app's next place_order() request. */
function nextPlaceOrder(page: Page): Promise<Request> {
  return page.waitForRequest(
    (request) => request.method() === "POST" && new URL(request.url()).pathname === "/rest/v1/rpc/place_order",
  );
}

/** What place_order() must be sent for this checkout: the chosen address and app, and the shown total. */
const EXPECTED_PLACE_ORDER_BODY = { p_address_id: ADDRESS_ID, p_upi_app: "phonepe", p_expected_total: EXPECTED_TOTAL };

test("A failed order shows why, keeps the checkout, and Try again places it", async ({ page, supabase }) => {
  await setUpPayment(page, supabase);
  // A temporary failure (not one of place_order()'s "review your bag" refusals). POST requests
  // aren't retried by postgrest-js, so this fails once.
  supabase.mock({
    method: "POST",
    path: "/rest/v1/rpc/place_order",
    status: 500,
    json: { code: "XX000", message: "synthetic: temporary failure", details: null, hint: null },
  });

  await page.goto("/checkout/payment");
  const phonePe = page.getByRole("radiogroup", { name: "UPI app", exact: true }).getByRole("radio", { name: "PhonePe", exact: true });
  await phonePe.click();
  await expect(phonePe).toHaveAttribute("aria-checked", "true");
  const pay = page.getByRole("button", { name: "Pay using PhonePe", exact: true });

  const firstAttempt = nextPlaceOrder(page);
  await pay.click();
  const firstBody: unknown = (await firstAttempt).postDataJSON();
  expect(firstBody).toEqual(EXPECTED_PLACE_ORDER_BODY);

  // Why, with a retry (CatalogueError); still on Payment, ready to pay again with the same choices.
  const failure = page.getByRole("alert").filter({ hasText: "Your order couldn’t be placed." });
  await expect(failure).toBeVisible();
  await expect(failure).toContainText("Could not place your order: synthetic: temporary failure");
  const tryAgain = failure.getByRole("button", { name: "Try again", exact: true });
  await expect(tryAgain).toBeVisible();
  await expect(page.getByText("Processing payment…", { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/checkout\/payment$/);
  await expect(pay).toBeEnabled();
  await expect(phonePe).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("link", { name: "Review your bag", exact: true })).toHaveCount(0);

  // The next attempt succeeds (registered now; the latest matching mock wins), and Payment Success
  // reads the order back.
  supabase.mock({ method: "POST", path: "/rest/v1/rpc/place_order", json: ORDER_NUMBER });
  supabase.mock({ method: "GET", path: "/rest/v1/orders", json: [ORDER_ROW] });

  const secondAttempt = nextPlaceOrder(page);
  await tryAgain.click();
  // Same address, app and total: the checkout was kept.
  expect((await secondAttempt).postDataJSON()).toEqual(firstBody);

  await expect(page).toHaveURL(new RegExp(`/payment-success\\?order=${ORDER_NUMBER}$`), { timeout: 15_000 });
  await expect(page.getByRole("status").filter({ hasText: "Payment Successful" })).toBeVisible();
  await expect(page.getByText(ORDER_NUMBER, { exact: true })).toBeVisible();
});

test("an order the database refuses as changed asks the customer to review the bag", async ({ page, supabase }) => {
  await setUpPayment(page, supabase);
  // place_order()'s REVIEW_BAG_CODE (55000) refusal, with migration 023's message for a changed total.
  const refusal =
    "Your bag has changed since you reviewed it: the total is now ₹12,000. Review your bag and try again.";
  supabase.mock({
    method: "POST",
    path: "/rest/v1/rpc/place_order",
    status: 400,
    json: { code: "55000", message: refusal, details: null, hint: null },
  });

  await page.goto("/checkout/payment");
  const pay = page.getByRole("button", { name: "Pay using Google Pay", exact: true });

  const attempt = nextPlaceOrder(page);
  await pay.click();
  expect((await attempt).postDataJSON()).toEqual({ ...EXPECTED_PLACE_ORDER_BODY, p_upi_app: "gpay" });

  // Why, and the way forward: review the Bag (trying again as-is would be refused the same way).
  const failure = page.getByRole("alert").filter({ hasText: "Your order couldn’t be placed." });
  await expect(failure).toBeVisible();
  await expect(failure).toContainText(`Could not place your order: ${refusal}`);
  await expect(failure.getByRole("link", { name: "Review your bag", exact: true })).toHaveAttribute("href", "/bag");
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toHaveCount(0);
  await expect(page.getByText("Processing payment…", { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/checkout\/payment$/);
  await expect(pay).toBeEnabled();
});

/** Whether a mocked request was answered for `POST /rest/v1/rpc/place_order` (by its redacted description). */
const isPlaceOrder = (handled: string) => handled.startsWith("POST ") && handled.includes(" /rest/v1/rpc/place_order");

test("a paid order empties the Bag and appears in My Orders, and a double-click places it once", async ({
  page,
  supabase,
}) => {
  await setUpPayment(page, supabase);
  supabase.mock({ method: "POST", path: "/rest/v1/rpc/place_order", json: ORDER_NUMBER });
  // Payment Success (getOrderByNumber()) and My Orders (listOrders()) read the new order, paid
  // with Google Pay as below.
  supabase.mock({ method: "GET", path: "/rest/v1/orders", json: [{ ...ORDER_ROW, upi_app: "gpay" }] });
  // place_order() removes the ordered Bag rows: once it has been answered, the Bag reads back
  // empty. Keyed on the guard's record of it (made before the response is sent), so the Bag
  // reload after the order can't race the test.
  supabase.mock({
    method: "GET",
    path: "/rest/v1/cart_items",
    match: () => supabase.handled.some(isPlaceOrder),
    json: [],
  });

  await page.goto("/checkout/payment");
  const pay = page.getByRole("button", { name: "Pay using Google Pay", exact: true });

  const placeOrder = nextPlaceOrder(page);
  await pay.dblclick();
  await expect(page.getByText("Processing payment…", { exact: true })).toBeVisible();
  expect((await placeOrder).postDataJSON()).toEqual({ ...EXPECTED_PLACE_ORDER_BODY, p_upi_app: "gpay" });

  // Payment Success shows the order the database returned.
  await expect(page).toHaveURL(new RegExp(`/payment-success\\?order=${ORDER_NUMBER}$`), { timeout: 15_000 });
  await expect(page.getByRole("status").filter({ hasText: "Payment Successful" })).toBeVisible();
  await expect(page.getByText(ORDER_NUMBER, { exact: true })).toBeVisible();

  // Track Order: My Orders lists the new order as in progress.
  await page.getByRole("link", { name: "Track Order", exact: true }).click();
  await expect(page).toHaveURL(/\/orders$/, { timeout: 15_000 });
  const inProgress = page.getByRole("region", { name: "In Progress Order", exact: true });
  await expect(inProgress.getByRole("article", { name: `Order ${ORDER_NUMBER}`, exact: true })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);

  // The Bag was reloaded empty: the header's Bag link has no item count.
  await expect(page.getByRole("link", { name: /^Bag\b/ })).toHaveAccessibleName("Bag");

  // The double-click placed one order, and nothing else was written (an unmocked write would
  // also fail the test in the network guard).
  expect(supabase.handled.filter(isPlaceOrder)).toHaveLength(1);
  expect(supabase.handled.filter((handled) => !/^(GET|HEAD) /.test(handled))).toEqual(
    supabase.handled.filter(isPlaceOrder),
  );
});
