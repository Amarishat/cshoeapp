import { expect, test, type Page } from "../support/mocked-test";

/*
 * Checkout · Address and Checkout · Order Summary for a guest with one selected, customised Bag
 * item: choosing a saved address, the summary it leads to, and the checks that keep an invalid
 * address out of checkout.
 *
 * Every Supabase request is answered by a mock with synthetic data (no real catalogue, Bag or
 * addresses). These tests make no writes: any write the app attempted would have no mock, so the
 * fixture would block it and fail the test.
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

/** An addresses row in the shape listAddresses() selects. */
function addressRow(fields: { id: string; full_name: string; state: string; is_default: boolean; created_at: string }) {
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

/** A saved address card on Checkout · Address (AddressCard: "Deliver to <full name>, …"). */
function addressCard(page: Page, fullName: string) {
  return page
    .getByRole("radiogroup", { name: "Saved addresses", exact: true })
    .getByRole("radio", { name: new RegExp(`^Deliver to ${fullName},`) });
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
