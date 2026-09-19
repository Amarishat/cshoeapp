/**
 * Static delivery estimate from the Order Summary frame (Figma 1:3495).
 * Not calculated in V1 — replace with a real estimate later.
 */
export const MOCK_DELIVERY_DATE = "Oct 11, Mon";

/** Order Summary item row. */
export const MOCK_DELIVERY_LABEL = `Delivery by ${MOCK_DELIVERY_DATE}`;

/** My Orders card and Order Details. */
export const MOCK_ARRIVAL_LABEL = `Arriving by ${MOCK_DELIVERY_DATE}`;

/** "Oct 11" — Order Details tracker ("Expected Delivery, Oct 11"). */
export const MOCK_DELIVERY_DAY = MOCK_DELIVERY_DATE.split(",")[0];
