"use client";

import { useId, useMemo } from "react";
import {
  adminField,
  adminToolbarButton,
  AdminSearchField,
  matchesTerms,
} from "@/components/admin/AdminSearchField";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { CatalogueProduct } from "@/lib/data/supabaseCatalog";

/*
 * Search and filters for the admin Products table. Everything here happens in
 * the browser over the catalogue that is already loaded — no extra query, no
 * write, nothing stored. Clearing puts the list back exactly as it was.
 */

export interface ProductFilters {
  /** Matched against name, slug and brand name. */
  search: string;
  /** A brand name, or "" for every brand. */
  brand: string;
  audience: "all" | "men" | "women" | "kids";
  customiser: "all" | "yes" | "no";
  productPage: "all" | "live" | "none";
}

export const NO_FILTERS: ProductFilters = {
  search: "",
  brand: "",
  audience: "all",
  customiser: "all",
  productPage: "all",
};

export function filtersActive(filters: ProductFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.brand !== "" ||
    filters.audience !== "all" ||
    filters.customiser !== "all" ||
    filters.productPage !== "all"
  );
}

/** Every term typed has to appear somewhere in the product's name, slug or brand. */
function matchesSearch(product: CatalogueProduct, search: string): boolean {
  return matchesTerms(`${product.name} ${product.slug} ${product.brandName}`, search);
}

/** The filters applied together: a product has to pass all of them. */
export function applyProductFilters(
  products: CatalogueProduct[],
  filters: ProductFilters,
): CatalogueProduct[] {
  return products.filter(
    (product) =>
      matchesSearch(product, filters.search) &&
      (filters.brand === "" || product.brandName === filters.brand) &&
      (filters.audience === "all" || product.audience === filters.audience) &&
      (filters.customiser === "all" || product.customizable === (filters.customiser === "yes")) &&
      (filters.productPage === "all" || product.hasProductPage === (filters.productPage === "live")),
  );
}

/** A labelled dropdown sized for the toolbar, not the customer forms. */
function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-caption text-ink/50">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className={cn(adminField, "appearance-none truncate pr-9")}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevronDown"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-40"
        />
      </div>
    </div>
  );
}

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "kids", label: "Kids" },
] as const;

const CUSTOMISER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "yes", label: "Customisable" },
  { value: "no", label: "Not customisable" },
] as const;

const PAGE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "none", label: "No page" },
] as const;

/** The toolbar above the table. `products` is only read, to list the brands. */
export function AdminProductFilters({
  products,
  filters,
  onChange,
  onClear,
}: {
  products: CatalogueProduct[];
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
  onClear: () => void;
}) {
  const brands = useMemo(
    () => [...new Set(products.map((product) => product.brandName))].sort((a, b) => a.localeCompare(b)),
    [products],
  );
  const active = filtersActive(filters);
  const set = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <search className="mt-8 rounded-card border border-border bg-page p-4">
      <div className="flex flex-wrap items-end gap-4">
        <AdminSearchField
          className="min-w-[260px] flex-1"
          placeholder="Name, slug or brand"
          value={filters.search}
          onChange={(value) => set("search", value)}
        />

        <Select
          label="Brand"
          className="w-[160px]"
          value={filters.brand}
          onChange={(value) => set("brand", value)}
          options={[
            { value: "", label: "All brands" },
            ...brands.map((brand) => ({ value: brand, label: brand })),
          ]}
        />
        <Select
          label="Audience"
          className="w-[130px]"
          value={filters.audience}
          onChange={(value) => set("audience", value)}
          options={[...AUDIENCE_OPTIONS]}
        />
        <Select
          label="Customiser"
          className="w-[170px]"
          value={filters.customiser}
          onChange={(value) => set("customiser", value)}
          options={[...CUSTOMISER_OPTIONS]}
        />
        <Select
          label="Product page"
          className="w-[130px]"
          value={filters.productPage}
          onChange={(value) => set("productPage", value)}
          options={[...PAGE_OPTIONS]}
        />

        {active && (
          <button
            type="button"
            onClick={onClear}
            className={adminToolbarButton}
          >
            Clear
          </button>
        )}
      </div>
    </search>
  );
}
