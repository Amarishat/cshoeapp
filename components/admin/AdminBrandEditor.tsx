"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import {
  getAdminBrand,
  updateAdminBrand,
  type AdminBrandDetail,
  type AdminBrandEdit,
} from "@/lib/data/adminBrands";
import { useCatalogueLoad } from "@/lib/useCatalogueLoad";
import { imagePathError } from "@/lib/validation/imagePath";

/** Brand editor — name, logo and order. The id (slug) can't change: products reference it. */
export function AdminBrandEditor({ brandId }: { brandId: string }) {
  const { state, retry } = useCatalogueLoad(getAdminBrand, brandId);

  if (state.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading brand" className="max-w-[560px] animate-pulse">
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
        <CatalogueError title="Couldn’t load the brand." message={state.message} onRetry={retry} />
      </div>
    );
  }
  if (!state.data) {
    return (
      <div className="max-w-[560px]">
        <h1 className="text-heading font-semibold">Brand not found</h1>
        <p className="mt-2 text-secondary text-ink/60">
          No brand has the id “{brandId}”.{" "}
          <Link href="/admin/brands" className="underline">
            Back to brands
          </Link>
        </p>
      </div>
    );
  }
  return <EditForm brand={state.data} />;
}

/** A number field that keeps what was typed, so a partly-typed value isn't fought. */
function numberError(text: string, { integer }: { integer: boolean }) {
  const value = Number(text);
  if (text.trim() === "" || Number.isNaN(value)) return "Enter a number.";
  if (integer && !Number.isInteger(value)) return "Enter a whole number.";
  if (!integer && value <= 0) return "Enter a number greater than 0.";
  if (integer && value < 0) return "Enter 0 or more.";
  return undefined;
}

function EditForm({ brand }: { brand: AdminBrandDetail }) {
  const router = useRouter();
  const [name, setName] = useState(brand.name);
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl);
  const [width, setWidth] = useState(String(brand.logoWidth));
  const [height, setHeight] = useState(String(brand.logoHeight));
  const [sortOrder, setSortOrder] = useState(String(brand.sortOrder));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const nameError = name.trim() === "" ? "Enter a brand name." : undefined;
  // A local image path only: anything else would break next/image here and on the storefront.
  const logoError = logoUrl.trim() === "" ? "Enter the logo path." : imagePathError(logoUrl.trim());
  const widthError = numberError(width, { integer: false });
  const heightError = numberError(height, { integer: false });
  const sortError = numberError(sortOrder, { integer: true });
  const invalid = !!(nameError || logoError || widthError || heightError || sortError);

  function edited<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setSaved(false);
    };
  }

  async function save() {
    if (saving || invalid) return;
    setSaving(true);
    setError("");
    const edit: AdminBrandEdit = {
      name,
      logoUrl,
      logoWidth: Number(width),
      logoHeight: Number(height),
      sortOrder: Number(sortOrder),
    };
    try {
      await updateAdminBrand(brand.id, edit);
      setSaved(true);
      router.replace("/admin/brands");
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
      <Link href="/admin/brands" className="text-secondary text-ink/60 underline">
        ← Brands
      </Link>
      <h1 className="mt-3 text-heading font-semibold">{brand.name}</h1>
      <p className="mt-2 text-secondary text-ink/60">Slug (id): {brand.id}</p>

      <div className="mt-8 flex flex-col gap-6 rounded-card border border-border bg-page p-8">
        <TextField
          label="Name"
          size="sm"
          value={name}
          error={nameError}
          onChange={(event) => edited(setName)(event.target.value)}
        />
        <TextField
          label="Logo path"
          size="sm"
          placeholder="/images/brands/nike.svg"
          value={logoUrl}
          error={logoError}
          onChange={(event) => edited(setLogoUrl)(event.target.value)}
        />

        <div className="flex items-end gap-5">
          <span className="flex size-[72px] shrink-0 items-center justify-center rounded-[9px] bg-surface">
            {!logoError ? (
              <Image
                src={logoUrl.trim()}
                alt=""
                width={44}
                height={44}
                unoptimized={logoUrl.trim().toLowerCase().endsWith(".svg")}
                className="max-h-11 w-11 object-contain"
              />
            ) : null}
          </span>
          <TextField
            label="Logo width (px)"
            size="sm"
            inputMode="decimal"
            className="flex-1"
            value={width}
            error={widthError}
            onChange={(event) => edited(setWidth)(event.target.value)}
          />
          <TextField
            label="Logo height (px)"
            size="sm"
            inputMode="decimal"
            className="flex-1"
            value={height}
            error={heightError}
            onChange={(event) => edited(setHeight)(event.target.value)}
          />
        </div>

        <TextField
          label="Sort order"
          size="sm"
          inputMode="numeric"
          value={sortOrder}
          error={sortError}
          onChange={(event) => edited(setSortOrder)(event.target.value)}
        />
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
        <Button type="submit" size="md" disabled={saving || invalid}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Link href="/admin/brands" className="text-label text-ink/60 underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
