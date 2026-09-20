"use client";

import { CatalogueError } from "@/components/product/CatalogueStatus";
import { cn } from "@/lib/cn";
import { loadAdminCustomizers } from "@/lib/data/adminCustomizer";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

const cell = "px-4 py-3 text-left align-middle";
const head = `${cell} text-secondary font-medium text-ink/60`;

/**
 * Customiser — read-only list of the products that have a configuration in
 * public.customization_configs, with how many parts and colours each one has.
 * Nothing here writes to Supabase.
 */
export function AdminCustomizerView() {
  const { state, retry } = useCatalogueLoad(loadAdminCustomizers);

  return (
    <section aria-labelledby="admin-customizer" className="max-w-[860px]">
      <h1 id="admin-customizer" className="text-heading font-semibold">
        Customizer
      </h1>
      <p className="mt-2 text-secondary text-ink/60">
        {state.status === "ready"
          ? `${state.data.length} ${state.data.length === 1 ? "product has" : "products have"} a customiser configuration`
          : "From public.customization_configs"}
      </p>

      {state.status === "error" && (
        <div className="mt-8">
          <CatalogueError title="Couldn’t load the customisers." message={state.message} onRetry={retry} />
        </div>
      )}

      {state.status === "loading" && (
        <div
          aria-busy="true"
          aria-label="Loading customisers"
          className="mt-8 animate-pulse rounded-card border border-border bg-page p-4"
        >
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-6 border-b border-border py-4 last:border-0">
              <span className="h-4 w-48 rounded bg-surface" />
              <span className="h-4 w-24 rounded bg-surface" />
              <span className="h-4 w-20 rounded bg-surface" />
            </div>
          ))}
        </div>
      )}

      {state.status === "ready" &&
        (state.data.length === 0 ? (
          <p className="mt-8 rounded-card border border-border bg-page p-10 text-center text-body text-ink/60">
            No product has a customiser configuration yet.
          </p>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-card border border-border bg-page">
            <table className="w-full border-collapse text-label">
              <caption className="sr-only">Products with a customiser</caption>
              <thead>
                <tr>
                  <th scope="col" className={head}>
                    Product
                  </th>
                  <th scope="col" className={head}>
                    Slug
                  </th>
                  <th scope="col" className={cn(head, "text-right")}>
                    Parts
                  </th>
                  <th scope="col" className={cn(head, "text-right")}>
                    Colours
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((config) => (
                  <tr key={config.productId} className="border-t border-border">
                    <td className={cell}>
                      <span className="block font-medium">{config.productName}</span>
                      <span className="block text-caption text-ink/50">
                        {config.title} · {config.displayCategory}
                      </span>
                    </td>
                    <td className={cn(cell, "text-ink/60")}>{config.productSlug}</td>
                    <td className={cn(cell, "text-right tabular-nums")}>{config.partCount}</td>
                    <td className={cn(cell, "text-right tabular-nums")}>{config.colourCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  );
}
