import { expect, test, type Page, type Request, type SupabaseMocks } from "../support/mocked-test";

/*
 * The Bag (/bag) for a guest: selecting items and the totals that follow, changing a quantity,
 * removing the last item, and an unavailable item that blocks Place Order until it is removed.
 *
 * Every Supabase request is answered by a mock with synthetic data (no real catalogue or Bag).
 * The Bag's writes (select, quantity, remove) are mocked too, and only their requests are
 * checked: nothing is stored. After a write succeeds the Bag updates its own copy (it doesn't
 * re-read), so the read mocks stay the same throughout each test.
 *
 * Plain products only (product pages, no customisation), so no 3D customiser or model loads.
 */

/** lib/pricing.ts: DELIVERY_FEE and PLATFORM_FEE, charged once per order with a selected item. */
const DELIVERY_FEE = 1250;
const PLATFORM_FEE = 9;

/** Top bar ("(₹5,000)", formatPrice) and price summary ("₹5,000.00", formatAmount) formats. */
const price = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const amount = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** A plain product with a product page, as both catalogue rows the Bag reads. */
function plainProduct(fields: { id: string; name: string; price: number }) {
  /** getProducts(): PRODUCT_COLUMNS. */
  const listRow = {
    id: fields.id,
    slug: fields.id,
    brand_id: "nike",
    name: fields.name,
    short_name: null,
    category: "Men's Shoes",
    audience: "men",
    price: fields.price,
    discount_label: null,
    rating: 4.5,
    description_excerpt: null,
    description_rest: null,
    details: null,
    card_image: { src: "/images/customizer/bag.svg", box: [0, 0, 100, 100] },
    // The Bag shows a page product by its cut-out; one without a cut-out isn't listed.
    cutout_url: "/images/customizer/bag.svg",
    cutout_frame: null,
    has_product_page: true,
    is_customizable: false,
    home_sections: [],
    created_at: "2026-01-01T00:00:00Z",
    brand: { id: "nike", name: "Nike" },
  };
  /** getProductBySlug(): PRODUCT_COLUMNS plus images, sizes and reviews. */
  const detailRow = {
    ...listRow,
    product_images: [],
    product_sizes: [{ size_uk: 8, is_default: true, sort_order: 0 }],
    product_reviews: [],
  };
  return { ...fields, listRow, detailRow };
}

const PRODUCT_A = plainProduct({ id: "e2e-shoe-a", name: "E2E Runner A", price: 5000 });
const PRODUCT_B = plainProduct({ id: "e2e-shoe-b", name: "E2E Runner B", price: 3000 });

/** A cart_items row (listCart()); fake ids, never real rows. */
function cartRow(fields: { id: string; product_id: string; quantity: number; is_selected: boolean }) {
  return { size_uk: 8, customization: null, created_at: "2026-01-01T00:00:00Z", ...fields };
}

const CART_A = cartRow({
  id: "00000000-0000-4000-8000-0000000ba90a",
  product_id: PRODUCT_A.id,
  quantity: 1,
  is_selected: true,
});
const CART_B = cartRow({
  id: "00000000-0000-4000-8000-0000000ba90b",
  product_id: PRODUCT_B.id,
  quantity: 1,
  is_selected: false,
});
/** Selected, but its product isn't in the catalogue (e.g. removed since it was added). */
const CART_UNAVAILABLE = cartRow({
  id: "00000000-0000-4000-8000-0000000ba90c",
  product_id: "e2e-retired-shoe",
  quantity: 1,
  is_selected: true,
});

/**
 * The catalogue reads for these products (lib/data/bagCatalogue.ts): the product list, then each
 * page product's details. Both are GET /rest/v1/products; a details request is matched by its
 * exact slug filter, so it never gets the whole list (getProductBySlug() uses maybeSingle()).
 */
function mockCatalogue(supabase: SupabaseMocks, products: ReturnType<typeof plainProduct>[]) {
  supabase.mock({ method: "GET", path: "/rest/v1/products", json: products.map((p) => p.listRow) });
  for (const product of products) {
    supabase.mock({
      method: "GET",
      path: "/rest/v1/products",
      match: (url) => url.searchParams.get("slug") === `eq.${product.id}`,
      json: [product.detailRow],
    });
  }
}

/** One Bag row (BagItemRow: <li> with the product name as its heading). */
function bagRow(page: Page, name: string) {
  return page.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });
}

/** One row of the price summary (<dl>: Subtotal, Delivery, Platform Fee, Total Amount): its amount. */
function summaryAmount(page: Page, label: string) {
  return page
    .locator("dl > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");
}

/** The Bag's top bar and price summary for a selected subtotal. */
async function expectTotals(page: Page, selected: string, subtotal: number) {
  const hasOrder = subtotal > 0;
  const delivery = hasOrder ? DELIVERY_FEE : 0;
  const platformFee = hasOrder ? PLATFORM_FEE : 0;
  await expect(page.getByText(selected, { exact: true })).toBeVisible();
  await expect(page.getByText(`(${price(subtotal)})`, { exact: true })).toBeVisible();
  await expect(summaryAmount(page, "Subtotal")).toHaveText(amount(subtotal));
  await expect(summaryAmount(page, "Delivery")).toHaveText(amount(delivery));
  await expect(summaryAmount(page, "Platform Fee")).toHaveText(amount(platformFee));
  await expect(summaryAmount(page, "Total Amount")).toHaveText(amount(subtotal + delivery + platformFee));
}

/** The app's next request to cart_items with this method. */
function nextCartRequest(page: Page, method: "PATCH" | "DELETE"): Promise<Request> {
  return page.waitForRequest(
    (request) => request.method() === method && new URL(request.url()).pathname === "/rest/v1/cart_items",
  );
}

test("selecting items updates the count and totals, and Place Order follows the selection", async ({
  page,
  supabase,
}) => {
  supabase.mock({ method: "GET", path: "/rest/v1/cart_items", json: [CART_A, CART_B] });
  mockCatalogue(supabase, [PRODUCT_A, PRODUCT_B]);
  // setCartSelected() / setAllCartSelected(): an update with no row returned.
  supabase.mock({ method: "PATCH", path: "/rest/v1/cart_items", status: 204 });

  await page.goto("/bag");
  const placeOrder = page.getByRole("button", { name: "Place Order", exact: true });

  // Only A is selected.
  await expect(bagRow(page, PRODUCT_A.name)).toBeVisible();
  await expect(bagRow(page, PRODUCT_B.name)).toBeVisible();
  await expectTotals(page, "1/2 Items Selected", PRODUCT_A.price);
  await expect(placeOrder).toBeEnabled();

  // Select B as well.
  const includeB = page.getByRole("checkbox", { name: `Include ${PRODUCT_B.name}, size 8, in order`, exact: true });
  await expect(includeB).toHaveAttribute("aria-checked", "false");
  let update = nextCartRequest(page, "PATCH");
  await includeB.click();
  expect((await update).postDataJSON()).toEqual({ is_selected: true });
  await expect(includeB).toHaveAttribute("aria-checked", "true");
  await expectTotals(page, "2/2 Items Selected", PRODUCT_A.price + PRODUCT_B.price);

  // Deselect everything: nothing to order, nothing charged, Place Order unavailable.
  update = nextCartRequest(page, "PATCH");
  await page.getByRole("checkbox", { name: "Deselect all items", exact: true }).click();
  expect((await update).postDataJSON()).toEqual({ is_selected: false });
  await expect(page.getByRole("checkbox", { name: "Select all items", exact: true })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await expectTotals(page, "0/2 Items Selected", 0);
  await expect(placeOrder).toBeDisabled();
});

test("changing a quantity updates the totals", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: "/rest/v1/cart_items", json: [CART_A] });
  mockCatalogue(supabase, [PRODUCT_A]);
  // setCartQuantity(): an update with no row returned.
  supabase.mock({ method: "PATCH", path: "/rest/v1/cart_items", status: 204 });

  await page.goto("/bag");
  const row = bagRow(page, PRODUCT_A.name);
  await expect(row.getByRole("status", { name: "Quantity 1", exact: true })).toBeVisible();
  await expectTotals(page, "1/1 Items Selected", PRODUCT_A.price);

  let update = nextCartRequest(page, "PATCH");
  await row.getByRole("button", { name: "Increase quantity", exact: true }).click();
  expect((await update).postDataJSON()).toEqual({ quantity: 2 });
  await expect(row.getByRole("status", { name: "Quantity 2", exact: true })).toBeVisible();
  await expectTotals(page, "1/1 Items Selected", PRODUCT_A.price * 2);

  update = nextCartRequest(page, "PATCH");
  await row.getByRole("button", { name: "Decrease quantity", exact: true }).click();
  expect((await update).postDataJSON()).toEqual({ quantity: 1 });
  await expect(row.getByRole("status", { name: "Quantity 1", exact: true })).toBeVisible();
  await expectTotals(page, "1/1 Items Selected", PRODUCT_A.price);
});

test("removing the last item asks first, then shows the empty Bag", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: "/rest/v1/cart_items", json: [CART_A] });
  mockCatalogue(supabase, [PRODUCT_A]);
  // removeCartItems(): a delete with no rows returned.
  supabase.mock({ method: "DELETE", path: "/rest/v1/cart_items", status: 204 });

  await page.goto("/bag");
  const row = bagRow(page, PRODUCT_A.name);

  // At quantity 1, "−" asks to remove the item.
  await row.getByRole("button", { name: "Remove item", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Remove this item?", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(`${PRODUCT_A.name}, size 8`);

  const removal = nextCartRequest(page, "DELETE");
  await dialog.getByRole("button", { name: "Remove", exact: true }).click();
  expect(new URL((await removal).url()).searchParams.get("id")).toBe(`in.(${CART_A.id})`);

  await expect(page.getByRole("heading", { name: "Your bag is empty", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue Shopping", exact: true })).toHaveAttribute("href", "/");
});

test("an unavailable selected item blocks Place Order until it is removed", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: "/rest/v1/cart_items", json: [CART_A, CART_UNAVAILABLE] });
  // The catalogue has A only: the second item's product can't be shown or priced.
  mockCatalogue(supabase, [PRODUCT_A]);
  supabase.mock({ method: "DELETE", path: "/rest/v1/cart_items", status: 204 });
  // Checkout · Address, after Place Order: the guest has no saved addresses.
  supabase.mock({ method: "GET", path: "/rest/v1/addresses", json: [] });

  await page.goto("/bag");
  await expect(bagRow(page, PRODUCT_A.name)).toBeVisible();

  const note = page.getByRole("status").filter({ hasText: "isn’t available right now" });
  await expect(note).toHaveText("1 item in your bag isn’t available right now and can’t be ordered. Remove it");
  const placeOrder = page.getByRole("button", { name: "Place Order", exact: true });
  await expect(placeOrder).toBeDisabled();

  await note.getByRole("button", { name: "Remove it", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Remove the unavailable item?", exact: true });
  await expect(dialog).toBeVisible();

  const removal = nextCartRequest(page, "DELETE");
  await dialog.getByRole("button", { name: "Remove", exact: true }).click();
  expect(new URL((await removal).url()).searchParams.get("id")).toBe(`in.(${CART_UNAVAILABLE.id})`);

  await expect(note).toHaveCount(0);
  await expect(placeOrder).toBeEnabled();
  await expectTotals(page, "1/1 Items Selected", PRODUCT_A.price);

  await placeOrder.click();
  await expect(page).toHaveURL(/\/checkout\/address$/);
});
