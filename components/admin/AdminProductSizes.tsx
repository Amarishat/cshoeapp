"use client";

import { CatalogueError } from "@/components/product/CatalogueStatus";
import { cn } from "@/lib/cn";
import { listAdminProductSizes } from "@/lib/data/adminProducts";
import { ukToUs } from "@/lib/sizes";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

const cell = "px-4 py-3 text-left align-middle";
const head = `${cell} text-secondary font-medium text-ink/60`;

/**
 * Product sizes — the rows in public.product_sizes for this product, in the
 * order the product page lists them (sort_order). Read-only: nothing here
 * adds, edits or removes a size.
 *
 * The table has no stock or availability column, so every size listed here is
 * simply a size the product page offers.
 */
export function AdminProductSizes({ productId }: { productId: string }) {
  const { state, retry } = useCatalogueLoad(listAdminProductSizes, productId);

  return (
    <section aria-labelledby="admin-product-sizes" className="mt-12 max-w-[720px]">
      <h2 id="admin-product-sizes" className="text-body font-semibold">
        Sizes
      </h2>
      <p className="mt-1.5 text-secondary text-ink/60">
        {state.status === "ready"
          ? `${state.data.length} ${state.data.length === 1 ? "size" : "sizes"} · listed in product-page order`
          : "From public.product_sizes"}
      </p>

      {state.status === "error" && (
        <div className="mt-6">
          <CatalogueError title="Couldn’t load the sizes." message={state.message} onRetry={retry} />
        </div>
      )}

      {state.status === "loading" && (
        <div
          aria-busy="true"
          aria-label="Loading sizes"
          className="mt-6 animate-pulse rounded-card border border-border bg-page p-4"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-6 border-b border-border py-3 last:border-0">
              <span className="h-4 w-16 rounded bg-surface" />
              <span className="h-4 w-16 rounded bg-surface" />
              <span className="h-4 w-24 rounded bg-surface" />
            </div>
          ))}
        </div>
      )}

      {state.status === "ready" &&
        (state.data.length === 0 ? (
          <p className="mt-6 rounded-card border border-border bg-page p-8 text-center text-secondary text-ink/60">
            This product has no sizes yet. A product page needs at least one, with one of them set as the
            default.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-card border border-border bg-page">
            <table className="w-full border-collapse text-label">
              <caption className="sr-only">Sizes offered for this product</caption>
              <thead>
                <tr>
                  <th scope="col" className={head}>
                    UK / India
                  </th>
                  <th scope="col" className={head}>
                    US
                  </th>
                  <th scope="col" className={head}>
                    Default
                  </th>
                  <th scope="col" className={head}>
                    Sort order
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((size) => (
                  <tr key={size.sizeUK} className="border-t border-border">
                    <td className={cn(cell, "font-medium tabular-nums")}>UK {size.sizeUK}</td>
                    <td className={cn(cell, "tabular-nums")}>US {ukToUs(size.sizeUK)}</td>
                    <td className={cell}>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-caption font-medium",
                          size.isDefault ? "bg-success/10 text-success" : "bg-surface text-ink/50",
                        )}
                      >
                        {size.isDefault ? "Default" : "—"}
                      </span>
                    </td>
                    <td className={cn(cell, "tabular-nums text-ink/60")}>#{size.sortOrder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  );
}
