"use client";

import Image from "next/image";
import Link from "next/link";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { cn } from "@/lib/cn";
import { getProducts, type CatalogueProduct } from "@/lib/data/supabaseCatalog";
import { formatPrice } from "@/lib/pricing";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

const AUDIENCE_LABEL = { men: "Men", women: "Women", kids: "Kids" } as const;

const cell = "px-4 py-3 text-left align-middle";
const head = `${cell} text-secondary font-medium text-ink/60`;

/** Small yes/no marker, so the two status columns read at a glance. */
function Flag({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-caption font-medium",
        on ? "bg-success/10 text-success" : "bg-surface text-ink/50",
      )}
    >
      {on ? yes : no}
    </span>
  );
}

function ProductRow({ product }: { product: CatalogueProduct }) {
  return (
    <tr className="border-t border-border">
      <td className={cell}>
        <span className="flex size-[52px] items-center justify-center rounded-[9px] bg-surface">
          <Image
            src={product.image.src}
            alt=""
            width={44}
            height={44}
            className="size-11 object-contain"
          />
        </span>
      </td>
      <td className={cell}>
        <span className="block font-medium">{product.name}</span>
        <span className="block text-caption text-ink/50">{product.slug}</span>
      </td>
      <td className={cell}>{product.brandName}</td>
      <td className={cn(cell, "whitespace-nowrap tabular-nums")}>{formatPrice(product.price)}</td>
      <td className={cell}>
        {product.discountLabel ? (
          <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 text-caption font-medium text-accent">
            {product.discountLabel}
          </span>
        ) : (
          <span className="text-ink/40">—</span>
        )}
      </td>
      <td className={cell}>{AUDIENCE_LABEL[product.audience]}</td>
      <td className={cell}>
        <Flag on={product.customizable} yes="Customisable" no="—" />
      </td>
      <td className={cell}>
        <Flag on={product.hasProductPage} yes="Live" no="No page" />
      </td>
      <td className={cn(cell, "text-right")}>
        <Link
          href={`/admin/products/${product.id}`}
          aria-label={`Edit ${product.name}`}
          className="rounded-[9px] border border-border px-3 py-1.5 text-secondary font-medium hover:bg-surface"
        >
          Edit
        </Link>
      </td>
    </tr>
  );
}

/**
 * Products — read-only list of everything in public.products, loaded with the
 * same catalogue query the storefront uses. Nothing here writes to Supabase.
 */
export function AdminProductsView() {
  const { state, retry } = useCatalogueLoad(getProducts);

  return (
    <section aria-labelledby="admin-products" className="max-w-[1100px]">
      <h1 id="admin-products" className="text-heading font-semibold">
        Products
      </h1>
      <p className="mt-2 text-secondary text-ink/60">
        {state.status === "ready"
          ? `${state.data.length} ${state.data.length === 1 ? "product" : "products"} in the catalogue`
          : "From the Supabase catalogue"}
      </p>

      {state.status === "error" && (
        <div className="mt-8">
          <CatalogueError title="Couldn’t load the products." message={state.message} onRetry={retry} />
        </div>
      )}

      {state.status === "loading" && (
        <div
          aria-busy="true"
          aria-label="Loading products"
          className="mt-8 animate-pulse rounded-card border border-border bg-page p-4"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border py-3 last:border-0">
              <div className="size-[52px] shrink-0 rounded-[9px] bg-surface" />
              <div className="h-4 w-1/4 rounded bg-surface" />
              <div className="h-4 w-1/6 rounded bg-surface" />
              <div className="h-4 w-20 rounded bg-surface" />
            </div>
          ))}
        </div>
      )}

      {state.status === "ready" &&
        (state.data.length === 0 ? (
          <p className="mt-8 rounded-card border border-border bg-page p-10 text-center text-body text-ink/60">
            No products in the catalogue yet.
          </p>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-card border border-border bg-page">
            <table className="w-full border-collapse text-label">
              <caption className="sr-only">Catalogue products</caption>
              <thead>
                <tr>
                  <th scope="col" className={head}>
                    <span className="sr-only">Image</span>
                  </th>
                  <th scope="col" className={head}>
                    Product
                  </th>
                  <th scope="col" className={head}>
                    Brand
                  </th>
                  <th scope="col" className={head}>
                    Price
                  </th>
                  <th scope="col" className={head}>
                    Discount
                  </th>
                  <th scope="col" className={head}>
                    Audience
                  </th>
                  <th scope="col" className={head}>
                    Customiser
                  </th>
                  <th scope="col" className={head}>
                    Product page
                  </th>
                  <th scope="col" className={head}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((product) => (
                  <ProductRow key={product.id} product={product} />
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  );
}
