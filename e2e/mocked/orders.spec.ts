import { expect, test, type Locator, type Page } from "../support/mocked-test";

/*
 * My Orders (/orders) for a guest: orders grouped by status with their details and actions,
 * search, cancelling a confirmed order, and the empty state.
 *
 * Every Supabase request is answered by a mock with synthetic data (no real orders). The one write
 * — cancel_order() in the cancel test — is mocked too, and only its request body is checked:
 * nothing is cancelled. The database's own rules (who may cancel, and when) are not exercised.
 *
 * Timestamps are at midday UTC, so the dates shown (local calendar dates in the browser) are the
 * same in any timezone within ±11 hours of UTC.
 */

const CONFIRMED_NUMBER = "OD99999990011";
const DELIVERED_NUMBER = "OD99999990022";
const CANCELLED_NUMBER = "OD99999990033";

type Status = "confirmed" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";

/** One order item in the shape of ORDER_COLUMNS' order_items. */
function itemRow(fields: {
  id: string;
  product_id: string;
  product_name: string;
  is_customized: boolean;
  order_item_customizations: { part_id: string; part_name: string; colour_id: string; colour_name: string }[];
}) {
  return {
    product_category: "Men's Shoes",
    image_url: "/images/customizer/bag.svg",
    image_fit: "contain",
    size_uk: 8,
    quantity: 1,
    unit_price: 9999,
    ...fields,
  };
}

/** An orders row in the shape listOrders() / getOrderByNumber() select (ORDER_COLUMNS). */
function orderRow(fields: {
  id: string;
  order_number: string;
  created_at: string;
  status: Status;
  cancelled_at?: string | null;
  shipped_at?: string | null;
  out_for_delivery_at?: string | null;
  delivered_at?: string | null;
  order_items: ReturnType<typeof itemRow>[];
}) {
  const subtotal = fields.order_items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const total = subtotal + 1250 + 9;
  return {
    cancelled_at: null,
    shipped_at: fields.status === "delivered" ? "2026-09-21T12:00:00Z" : null,
    out_for_delivery_at: fields.status === "delivered" ? "2026-09-24T12:00:00Z" : null,
    delivered_at: null,
    address_id: "00000000-0000-4000-8000-0000000add01",
    ship_full_name: "Test Guest",
    ship_phone: "9876543210",
    ship_pincode: "560001",
    ship_state: "Karnataka",
    ship_city: "Bengaluru",
    ship_area: "MG Road",
    ship_street: "1 Test Street",
    ship_type: "home",
    payment_method: "upi",
    upi_app: "gpay",
    subtotal,
    discount: 0,
    delivery_fee: 1250,
    platform_fee: 9,
    total,
    amount_paid: total,
    ...fields,
  };
}

/** Confirmed: a customised first item plus one more item. */
const CONFIRMED_ORDER = orderRow({
  id: "00000000-0000-4000-8000-000000000d11",
  order_number: CONFIRMED_NUMBER,
  created_at: "2026-09-19T12:00:00Z",
  status: "confirmed",
  order_items: [
    itemRow({
      id: "00000000-0000-4000-8000-000000000e11",
      product_id: "nike-air-force",
      product_name: "Nike Air Force",
      is_customized: true,
      order_item_customizations: [{ part_id: "vamp", part_name: "Vamp", colour_id: "black", colour_name: "Black" }],
    }),
    itemRow({
      id: "00000000-0000-4000-8000-000000000e12",
      product_id: "nike-sabrina-2-ep",
      product_name: "Nike Sabrina 2 EP",
      is_customized: false,
      order_item_customizations: [],
    }),
  ],
});

const DELIVERED_ORDER = orderRow({
  id: "00000000-0000-4000-8000-000000000d22",
  order_number: DELIVERED_NUMBER,
  created_at: "2026-09-10T12:00:00Z",
  status: "delivered",
  delivered_at: "2026-09-25T12:00:00Z",
  order_items: [
    itemRow({
      id: "00000000-0000-4000-8000-000000000e22",
      product_id: "nike-sabrina-2-ep",
      product_name: "Nike Sabrina 2 EP",
      is_customized: false,
      order_item_customizations: [],
    }),
  ],
});

const CANCELLED_ORDER = orderRow({
  id: "00000000-0000-4000-8000-000000000d33",
  order_number: CANCELLED_NUMBER,
  created_at: "2026-09-15T12:00:00Z",
  status: "cancelled",
  cancelled_at: "2026-09-16T12:00:00Z",
  order_items: [
    itemRow({
      id: "00000000-0000-4000-8000-000000000e33",
      product_id: "nike-air-force",
      product_name: "Nike Air Force",
      is_customized: false,
      order_item_customizations: [],
    }),
  ],
});

/** All three, newest first (listOrders() orders by created_at, descending). */
const ALL_ORDERS = [CONFIRMED_ORDER, CANCELLED_ORDER, DELIVERED_ORDER];

const SHIPPED_NUMBER = "OD99999990044";
const OUT_FOR_DELIVERY_NUMBER = "OD99999990055";

/** Shipped (past "confirmed"): can no longer be cancelled. */
const SHIPPED_ORDER = orderRow({
  id: "00000000-0000-4000-8000-000000000d44",
  order_number: SHIPPED_NUMBER,
  created_at: "2026-09-19T12:00:00Z",
  status: "shipped",
  shipped_at: "2026-09-21T12:00:00Z",
  order_items: [
    itemRow({
      id: "00000000-0000-4000-8000-000000000e44",
      product_id: "nike-air-force",
      product_name: "Nike Air Force",
      is_customized: false,
      order_item_customizations: [],
    }),
  ],
});

/** Out for delivery: can no longer be cancelled either. */
const OUT_FOR_DELIVERY_ORDER = orderRow({
  id: "00000000-0000-4000-8000-000000000d55",
  order_number: OUT_FOR_DELIVERY_NUMBER,
  created_at: "2026-09-18T12:00:00Z",
  status: "out_for_delivery",
  shipped_at: "2026-09-20T12:00:00Z",
  out_for_delivery_at: "2026-09-23T12:00:00Z",
  order_items: [
    itemRow({
      id: "00000000-0000-4000-8000-000000000e55",
      product_id: "nike-sabrina-2-ep",
      product_name: "Nike Sabrina 2 EP",
      is_customized: false,
      order_item_customizations: [],
    }),
  ],
});

/** OrderCard's stand-in for Cancel once an order has shipped: a div, not a button (no role). */
const UNAVAILABLE_CANCEL_TEXT = "Cancel (not available once an order has shipped)";

/** A My Orders section by its heading ("In Progress Order", "Completed Orders", "Cancelled Orders"). */
function section(page: Page, heading: string) {
  return page.getByRole("region", { name: heading, exact: true });
}

/** One order card (OrderCard: <article aria-label="Order <number>">), on the page or in a section. */
function orderCard(scope: Page | Locator, orderNumber: string) {
  return scope.getByRole("article", { name: `Order ${orderNumber}`, exact: true });
}

test("orders are grouped by status with their details and actions", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: "/rest/v1/orders", json: ALL_ORDERS });

  await page.goto("/orders");

  // Each order in its own section.
  await expect(orderCard(section(page, "In Progress Order"), CONFIRMED_NUMBER)).toBeVisible();
  await expect(orderCard(section(page, "Completed Orders"), DELIVERED_NUMBER)).toBeVisible();
  await expect(orderCard(section(page, "Cancelled Orders"), CANCELLED_NUMBER)).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(3);

  // Confirmed: customised first item, one more item, size, arrival estimate (21 days after
  // 19 Sep 2026: Sat 10 Oct), an enabled Cancel and View Order to its details.
  const confirmed = orderCard(page, CONFIRMED_NUMBER);
  await expect(confirmed.getByRole("heading", { name: "In Progress Order", exact: true })).toBeVisible();
  await expect(confirmed.getByText("Nike Air Force", { exact: true })).toBeVisible();
  await expect(confirmed.getByText("Customised", { exact: true })).toBeVisible();
  await expect(confirmed.getByText("+1 more item", { exact: true })).toBeVisible();
  await expect(confirmed.getByText("Size : 8", { exact: true })).toBeVisible();
  await expect(confirmed.getByText("Arriving by Oct 10, Sat", { exact: true })).toBeVisible();
  await expect(confirmed.getByRole("button", { name: `Cancel order ${CONFIRMED_NUMBER}`, exact: true })).toBeEnabled();
  await expect(confirmed.getByRole("link", { name: "View Order", exact: true })).toHaveAttribute(
    "href",
    `/orders/${CONFIRMED_NUMBER}`,
  );

  // Delivered: completed, with its delivery date, and only View Order.
  const delivered = orderCard(page, DELIVERED_NUMBER);
  await expect(delivered.getByRole("heading", { name: "Completed Order", exact: true })).toBeVisible();
  await expect(delivered.getByText("Delivered on 25 Sep 2026", { exact: true })).toBeVisible();
  await expect(delivered.getByText("Cancel", { exact: true })).toHaveCount(0);
  await expect(delivered.getByRole("link", { name: "View Order", exact: true })).toHaveAttribute(
    "href",
    `/orders/${DELIVERED_NUMBER}`,
  );

  // Cancelled: its cancellation date, and only View Order.
  const cancelled = orderCard(page, CANCELLED_NUMBER);
  await expect(cancelled.getByRole("heading", { name: "Cancelled Order", exact: true })).toBeVisible();
  await expect(cancelled.getByText("Cancelled on 16 Sep 2026", { exact: true })).toBeVisible();
  await expect(cancelled.getByText("Cancel", { exact: true })).toHaveCount(0);
  await expect(cancelled.getByRole("link", { name: "View Order", exact: true })).toHaveAttribute(
    "href",
    `/orders/${CANCELLED_NUMBER}`,
  );
});

test("searching filters orders by order number and says when nothing matches", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: "/rest/v1/orders", json: ALL_ORDERS });

  await page.goto("/orders");
  await expect(page.getByRole("article")).toHaveCount(3);

  // The input sits inside its <label>, so its accessible name can include what is typed: match the start.
  const search = page.getByRole("searchbox", { name: /^Search your orders/ });

  // Part of one order number: only that order is left, and the count is announced.
  await search.fill("990022");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(orderCard(page, DELIVERED_NUMBER)).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "1 order found" })).toHaveText("1 order found");

  // Nothing matches: no orders, and the page says so.
  await search.fill("no such order");
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.getByText("No orders match “no such order”.", { exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "0 orders found" })).toHaveText("0 orders found");
});

test("cancelling a confirmed order calls cancel_order and shows it cancelled", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: "/rest/v1/orders", json: [CONFIRMED_ORDER] });

  await page.goto("/orders");
  const card = orderCard(page, CONFIRMED_NUMBER);
  await expect(orderCard(section(page, "In Progress Order"), CONFIRMED_NUMBER)).toBeVisible();

  await card.getByRole("button", { name: `Cancel order ${CONFIRMED_NUMBER}`, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cancel this order?", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(`Order ${CONFIRMED_NUMBER} will be cancelled.`);

  // What the database would return: cancel_order()'s row, then the order read back
  // (getOrderByNumber()) in its cancelled state. Registered now — the list has already loaded,
  // and the latest matching mock wins.
  supabase.mock({
    method: "POST",
    path: "/rest/v1/rpc/cancel_order",
    json: [{ order_number: CONFIRMED_NUMBER, status: "cancelled" }],
  });
  supabase.mock({
    method: "GET",
    path: "/rest/v1/orders",
    json: [{ ...CONFIRMED_ORDER, status: "cancelled", cancelled_at: "2026-09-20T12:00:00Z" }],
  });

  const cancelRequest = page.waitForRequest(
    (request) => request.method() === "POST" && new URL(request.url()).pathname === "/rest/v1/rpc/cancel_order",
  );
  await dialog.getByRole("button", { name: "Cancel Order", exact: true }).click();

  expect((await cancelRequest).postDataJSON()).toEqual({ p_order_number: CONFIRMED_NUMBER });

  // The card now shows the order as cancelled, in Cancelled Orders, with no Cancel action.
  await expect(orderCard(section(page, "Cancelled Orders"), CONFIRMED_NUMBER)).toBeVisible();
  await expect(section(page, "In Progress Order")).toHaveCount(0);
  await expect(card.getByRole("heading", { name: "Cancelled Order", exact: true })).toBeVisible();
  await expect(card.getByText("Cancelled on 20 Sep 2026", { exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: `Cancel order ${CONFIRMED_NUMBER}`, exact: true })).toHaveCount(0);
  await expect(card.getByRole("alert")).toHaveCount(0);
});

test("shipped and out-for-delivery orders show Cancel as unavailable", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: "/rest/v1/orders", json: [SHIPPED_ORDER, OUT_FOR_DELIVERY_ORDER] });

  await page.goto("/orders");

  const inProgress = section(page, "In Progress Order");
  for (const { number, progress } of [
    { number: SHIPPED_NUMBER, progress: "Shipped (done)" },
    { number: OUT_FOR_DELIVERY_NUMBER, progress: "Out for Delivery (done)" },
  ]) {
    const card = orderCard(inProgress, number);
    await expect(card).toBeVisible();
    // Tracker: the stage reached; not delivered yet.
    const tracker = card.getByRole("list", { name: "Order progress", exact: true });
    await expect(tracker).toContainText(progress);
    await expect(tracker).toContainText("Delivered (pending)");
    await expect(card.getByText(/^Arriving by /)).toBeVisible();
    await expect(card.getByRole("link", { name: "View Order", exact: true })).toHaveAttribute("href", `/orders/${number}`);
    // No active Cancel: only the unavailable stand-in.
    await expect(card.getByRole("button", { name: `Cancel order ${number}`, exact: true })).toHaveCount(0);
    await expect(card.locator('[aria-disabled="true"]')).toHaveText(UNAVAILABLE_CANCEL_TEXT);
  }
});

test("a refused cancellation shows why and the order as it is now", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: "/rest/v1/orders", json: [CONFIRMED_ORDER] });

  await page.goto("/orders");
  const card = orderCard(page, CONFIRMED_NUMBER);
  await card.getByRole("button", { name: `Cancel order ${CONFIRMED_NUMBER}`, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cancel this order?", exact: true });
  await expect(dialog).toBeVisible();

  // The database refuses: the order shipped since the list loaded (cancel_order() raises 55000).
  // Then the order is read back as it is now. Registered now; the latest matching mock wins.
  supabase.mock({
    method: "POST",
    path: "/rest/v1/rpc/cancel_order",
    status: 400,
    json: { code: "55000", message: "synthetic: order has shipped", details: null, hint: null },
  });
  supabase.mock({
    method: "GET",
    path: "/rest/v1/orders",
    json: [{ ...CONFIRMED_ORDER, status: "shipped", shipped_at: "2026-09-21T12:00:00Z" }],
  });

  const cancelRequest = page.waitForRequest(
    (request) => request.method() === "POST" && new URL(request.url()).pathname === "/rest/v1/rpc/cancel_order",
  );
  await dialog.getByRole("button", { name: "Cancel Order", exact: true }).click();
  expect((await cancelRequest).postDataJSON()).toEqual({ p_order_number: CONFIRMED_NUMBER });

  // Why, in plain words (lib/data/userOrders.ts cancelOrder: code 55000), on the order's card.
  await expect(card.getByRole("alert")).toHaveText(
    "Could not cancel this order: it has already shipped. Only an order that hasn’t shipped yet can be cancelled",
  );
  // The order as it is now: still in progress, shipped, and no longer cancellable.
  await expect(orderCard(section(page, "In Progress Order"), CONFIRMED_NUMBER)).toBeVisible();
  await expect(card.getByRole("list", { name: "Order progress", exact: true })).toContainText("Shipped (done)");
  await expect(card.getByRole("button", { name: `Cancel order ${CONFIRMED_NUMBER}`, exact: true })).toHaveCount(0);
  await expect(card.locator('[aria-disabled="true"]')).toHaveText(UNAVAILABLE_CANCEL_TEXT);
  await expect(section(page, "Cancelled Orders")).toHaveCount(0);
});

test("a search in the URL (?q=) is pre-filled and filters the orders", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: "/rest/v1/orders", json: ALL_ORDERS });

  await page.goto("/orders?q=990022");

  await expect(page.getByRole("searchbox", { name: /^Search your orders/ })).toHaveValue("990022");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(orderCard(page, DELIVERED_NUMBER)).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "1 order found" })).toHaveText("1 order found");
});

test("a failed load shows an error, and Try again loads the orders", async ({ page, supabase }) => {
  // 500, not 503/520: postgrest-js retries a GET on those itself, which would delay the error.
  supabase.mock({
    method: "GET",
    path: "/rest/v1/orders",
    status: 500,
    json: { code: "XX000", message: "synthetic load failure", details: null, hint: null },
  });

  await page.goto("/orders");

  const loadError = page.getByRole("alert").filter({ hasText: "Couldn’t load your orders." });
  await expect(loadError).toBeVisible();
  const tryAgain = loadError.getByRole("button", { name: "Try again", exact: true });
  await expect(tryAgain).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);

  // The next read succeeds (registered now; the latest matching mock wins).
  supabase.mock({ method: "GET", path: "/rest/v1/orders", json: [CONFIRMED_ORDER] });
  await tryAgain.click();

  await expect(orderCard(section(page, "In Progress Order"), CONFIRMED_NUMBER)).toBeVisible();
  await expect(loadError).toHaveCount(0);
});

test("a guest with no orders sees the empty state", async ({ page, supabase }) => {
  supabase.mock({ method: "GET", path: "/rest/v1/orders", json: [] });

  await page.goto("/orders");

  await expect(page.getByRole("heading", { name: "No orders yet", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start Shopping", exact: true })).toHaveAttribute("href", "/");
  await expect(page.getByRole("article")).toHaveCount(0);
});
