"use client";

import Image from "next/image";
import Link from "next/link";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { cn } from "@/lib/cn";
import { loadAdminBrands } from "@/lib/data/adminBrands";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

const cell = "px-4 py-3 text-left align-middle";
const head = `${cell} text-secondary font-medium text-ink/60`;

/**
 * Brands — read-only list of public.brands in brand-row order, with how many
 * products name each one. Nothing here writes to Supabase.
 */
export function AdminBrandsView() {
  const { state, retry } = useCatalogueLoad(loadAdminBrands);

  return (
    <section aria-labelledby="admin-brands" className="max-w-[720px]">
      <h1 id="admin-brands" className="text-heading font-semibold">
        Brands
      </h1>
      <p className="mt-2 text-secondary text-ink/60">
        {state.status === "ready"
          ? `${state.data.length} ${state.data.length === 1 ? "brand" : "brands"} · the id is the slug used in /brands/…`
          : "From the Supabase catalogue"}
      </p>

      {state.status === "error" && (
        <div className="mt-8">
          <CatalogueError title="Couldn’t load the brands." message={state.message} onRetry={retry} />
        </div>
      )}

      {state.status === "loading" && (
        <div
          aria-busy="true"
          aria-label="Loading brands"
          className="mt-8 animate-pulse rounded-card border border-border bg-page p-4"
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border py-3 last:border-0">
              <span className="size-[52px] shrink-0 rounded-[9px] bg-surface" />
              <span className="h-4 w-32 rounded bg-surface" />
              <span className="h-4 w-24 rounded bg-surface" />
            </div>
          ))}
        </div>
      )}

      {state.status === "ready" &&
        (state.data.length === 0 ? (
          <p className="mt-8 rounded-card border border-border bg-page p-10 text-center text-body text-ink/60">
            No brands in the catalogue yet.
          </p>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-card border border-border bg-page">
            <table className="w-full border-collapse text-label">
              <caption className="sr-only">Catalogue brands</caption>
              <thead>
                <tr>
                  <th scope="col" className={head}>
                    <span className="sr-only">Logo</span>
                  </th>
                  <th scope="col" className={head}>
                    Brand
                  </th>
                  <th scope="col" className={head}>
                    Slug (id)
                  </th>
                  <th scope="col" className={cn(head, "text-right")}>
                    Products
                  </th>
                  <th scope="col" className={head}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((brand) => (
                  <tr key={brand.id} className="border-t border-border">
                    <td className={cell}>
                      <span className="flex size-[52px] items-center justify-center rounded-[9px] bg-surface">
                        <Image
                          src={brand.logoUrl}
                          alt=""
                          width={36}
                          height={36}
                          unoptimized={brand.logoUrl.endsWith(".svg")}
                          className="max-h-9 w-9 object-contain"
                        />
                      </span>
                    </td>
                    <td className={cn(cell, "font-medium")}>{brand.name}</td>
                    <td className={cn(cell, "text-ink/60")}>{brand.id}</td>
                    <td className={cn(cell, "text-right tabular-nums")}>
                      {brand.productCount === 0 ? (
                        <span className="text-ink/40">0</span>
                      ) : (
                        brand.productCount
                      )}
                    </td>
                    <td className={cn(cell, "text-right")}>
                      <Link
                        href={`/admin/brands/${brand.id}`}
                        aria-label={`Edit ${brand.name}`}
                        className="rounded-[9px] border border-border px-3 py-1.5 text-secondary font-medium hover:bg-surface"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  );
}
