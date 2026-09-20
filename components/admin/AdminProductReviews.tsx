"use client";

import { CatalogueError } from "@/components/product/CatalogueStatus";
import { Icon } from "@/components/ui/Icon";
import { listAdminProductReviews, type AdminProductReview } from "@/lib/data/adminProducts";
import { formatEventDate } from "@/lib/orders";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

function ReviewRow({ review }: { review: AdminProductReview }) {
  return (
    <li className="flex flex-col gap-2 border-t border-border p-5 first:border-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5">
          <Icon name="star" className="size-5 text-[#ffc107]" />
          <span className="text-label font-medium tabular-nums">
            <span className="sr-only">Rated </span>
            {review.rating}
            <span className="text-ink/50">/5</span>
          </span>
        </span>
        <span className="text-label">{review.author}</span>
        <span className="ml-auto text-caption text-ink/50">{formatEventDate(review.createdAt)}</span>
      </div>
      <p className="text-secondary text-ink/70 [overflow-wrap:anywhere]">{review.text}</p>
    </li>
  );
}

/**
 * Product reviews — the rows in public.product_reviews for this product,
 * oldest first, as the product page lists them. Read-only: nothing here adds,
 * edits, deletes or moderates a review (the table has no status field), and
 * the reviewer's account id is never read or shown.
 */
export function AdminProductReviews({ productId }: { productId: string }) {
  const { state, retry } = useCatalogueLoad(listAdminProductReviews, productId);

  return (
    <section aria-labelledby="admin-product-reviews" className="mt-12 mb-4 max-w-[720px]">
      <h2 id="admin-product-reviews" className="text-body font-semibold">
        Reviews
      </h2>
      <p className="mt-1.5 text-secondary text-ink/60">
        {state.status === "ready"
          ? `${state.data.length} ${state.data.length === 1 ? "review" : "reviews"} · oldest first, as the product page shows them`
          : "From public.product_reviews"}
      </p>

      {state.status === "error" && (
        <div className="mt-6">
          <CatalogueError title="Couldn’t load the reviews." message={state.message} onRetry={retry} />
        </div>
      )}

      {state.status === "loading" && (
        <ul
          aria-busy="true"
          aria-label="Loading reviews"
          className="mt-6 animate-pulse rounded-card border border-border bg-page"
        >
          {[0, 1].map((i) => (
            <li key={i} className="flex flex-col gap-2 border-t border-border p-5 first:border-0">
              <span className="h-4 w-40 rounded bg-surface" />
              <span className="h-4 w-full rounded bg-surface" />
              <span className="h-4 w-2/3 rounded bg-surface" />
            </li>
          ))}
        </ul>
      )}

      {state.status === "ready" &&
        (state.data.length === 0 ? (
          <p className="mt-6 rounded-card border border-border bg-page p-8 text-center text-secondary text-ink/60">
            No reviews yet. The product page shows “Reviews (0)” until one is written.
          </p>
        ) : (
          <ul className="mt-6 rounded-card border border-border bg-page">
            {state.data.map((review) => (
              <ReviewRow key={review.id} review={review} />
            ))}
          </ul>
        ))}
    </section>
  );
}
