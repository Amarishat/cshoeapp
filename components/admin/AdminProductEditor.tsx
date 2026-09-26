"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  getAdminProduct,
  productPageBlocker,
  updateAdminProduct,
  type AdminProduct,
  type AdminProductEdit,
} from "@/lib/data/adminProducts";
import { formatPrice } from "@/lib/pricing";
import type { Audience } from "@/lib/types";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";

const AUDIENCES: { value: Audience; label: string }[] = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "kids", label: "Kids" },
];

const labelFor = (audience: Audience) => AUDIENCES.find((a) => a.value === audience)?.label ?? "";
const audienceFor = (label: string) => AUDIENCES.find((a) => a.label === label)?.value ?? "men";

/** Product editor — the scalar fields only; images, sizes and the customiser are not edited here. */
export function AdminProductEditor({ productId }: { productId: string }) {
  const { state, retry } = useCatalogueLoad(getAdminProduct, productId);

  if (state.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading product" className="max-w-[560px] animate-pulse">
        <div className="h-7 w-1/3 rounded bg-surface" />
        <div className="mt-8 flex flex-col gap-6 rounded-card border border-border bg-page p-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[70px] rounded bg-surface" />
          ))}
        </div>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="max-w-[560px]">
        <CatalogueError title="Couldn’t load the product." message={state.message} onRetry={retry} />
      </div>
    );
  }
  if (!state.data) {
    return (
      <div className="max-w-[560px]">
        <h1 className="text-heading font-semibold">Product not found</h1>
        <p className="mt-2 text-secondary text-ink/60">
          No product has the id “{productId}”.{" "}
          <Link href="/admin/products" className="underline">
            Back to products
          </Link>
        </p>
      </div>
    );
  }
  return <EditForm product={state.data} />;
}

function EditForm({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const [form, setForm] = useState<AdminProductEdit>(product);
  const [priceText, setPriceText] = useState(String(product.price));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  // Switching "Product page live" on is checked first; why it can't be, if so.
  const [checkingPage, setCheckingPage] = useState(false);
  const [pageBlocked, setPageBlocked] = useState("");

  const price = Number(priceText);
  const priceError =
    priceText.trim() === "" || !Number.isInteger(price) || price <= 0
      ? "Enter the price in whole rupees."
      : undefined;
  const nameError = form.name.trim() === "" ? "Enter a product name." : undefined;

  function set<K extends keyof AdminProductEdit>(key: K, value: AdminProductEdit[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  /**
   * Off always works. On only once the product has everything its page needs
   * (the customer page's own rule), so it never leads customers to a broken page.
   */
  async function setProductPage(on: boolean) {
    if (checkingPage) return;
    setPageBlocked("");
    if (!on) return set("hasProductPage", false);
    setCheckingPage(true);
    try {
      const blocker = await productPageBlocker(product.slug);
      if (blocker) setPageBlocked(`Can’t switch the product page on: ${blocker}`);
      else set("hasProductPage", true);
    } catch (thrown) {
      setPageBlocked(
        `Couldn’t check the product page’s data: ${thrown instanceof Error ? thrown.message : String(thrown)}`,
      );
    } finally {
      setCheckingPage(false);
    }
  }

  async function save() {
    if (saving || nameError || priceError) return;
    setSaving(true);
    setError("");
    try {
      await updateAdminProduct(product.id, { ...form, price });
      setSaved(true);
      // Back to the list, which reloads and shows the saved values.
      router.replace("/admin/products");
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : String(thrown));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="max-w-[560px]"
    >
      <Link href="/admin/products" className="text-secondary text-ink/60 underline">
        ← Products
      </Link>
      <h1 className="mt-3 text-heading font-semibold">{product.name}</h1>
      <p className="mt-2 text-secondary text-ink/60">
        {product.brandName} · {product.slug}
      </p>

      <div className="mt-8 flex flex-col gap-6 rounded-card border border-border bg-page p-8">
        <TextField
          label="Name"
          size="sm"
          value={form.name}
          error={nameError}
          onChange={(event) => set("name", event.target.value)}
        />
        <TextField
          label="Price (₹)"
          size="sm"
          inputMode="numeric"
          value={priceText}
          error={priceError}
          onChange={(event) => {
            setPriceText(event.target.value.replace(/[^0-9]/g, ""));
            setSaved(false);
          }}
        />
        <SelectField
          label="Audience"
          placeholder="Choose an audience"
          options={AUDIENCES.map((a) => a.label)}
          value={labelFor(form.audience)}
          onChange={(event) => set("audience", audienceFor(event.target.value))}
        />
        <div>
          <TextField
            label="Discount label"
            size="sm"
            placeholder="e.g. 10% OFF — display-only, not shown to customers"
            value={form.discountLabel}
            onChange={(event) => set("discountLabel", event.target.value)}
          />
          <p className="mt-1.5 text-caption text-ink/50">
            Display-only: never applied to the price, and not currently shown to customers.
          </p>
        </div>

        <div className="flex flex-col gap-5 border-t border-border pt-6">
          <Checkbox
            variant="form"
            checked={form.isCustomizable}
            onChange={(checked) => set("isCustomizable", checked)}
          >
            <span className="text-label">
              Customisable
              <span className="block text-caption text-ink/50">
                Shows the Customise pill; needs a customiser config to open.
              </span>
            </span>
          </Checkbox>
          <Checkbox
            variant="form"
            checked={form.hasProductPage}
            onChange={(checked) => void setProductPage(checked)}
          >
            <span className="text-label">
              Product page live
              <span className="block text-caption text-ink/50">
                {checkingPage
                  ? "Checking the product page’s data…"
                  : `Makes /products/${product.slug} reachable and its cards clickable.`}
              </span>
            </span>
          </Checkbox>
          {pageBlocked && (
            <p role="alert" className="-mt-2 text-secondary text-danger [overflow-wrap:anywhere]">
              {pageBlocked}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 text-secondary text-danger [overflow-wrap:anywhere]">
          {error}
        </p>
      )}
      <p role="status" className="mt-6 text-secondary text-success">
        {saved && !error ? "Saved" : ""}
      </p>

      <div className="mt-2 flex items-center gap-4">
        <Button type="submit" size="md" disabled={saving || !!nameError || !!priceError}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Link href="/admin/products" className="text-label text-ink/60 underline">
          Cancel
        </Link>
        <span className="ml-auto text-caption text-ink/50">Current: {formatPrice(product.price)}</span>
      </div>
    </form>
  );
}
