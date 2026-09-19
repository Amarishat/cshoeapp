import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupabaseCheck } from "./SupabaseCheck";

export const metadata: Metadata = { title: "Supabase check" };

// Development-only Supabase connection check; 404 in production.
export default function DevSupabasePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SupabaseCheck />;
}
