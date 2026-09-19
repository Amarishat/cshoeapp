import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UiPreview } from "./UiPreview";

export const metadata: Metadata = { title: "UI preview" };

// Development-only page for checking foundation components; 404 in production.
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiPreview />;
}
