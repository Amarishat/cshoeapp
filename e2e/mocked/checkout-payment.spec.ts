import { expect, test } from "../support/mocked-test";

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
