import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestSessionProvider } from "@/components/providers/GuestSessionProvider";
import { SupabaseCheck } from "./SupabaseCheck";

export const metadata: Metadata = { title: "Supabase check" };

// Development-only Supabase connection check; 404 in production.
export default function DevSupabasePage() {
  if (process.env.NODE_ENV === "production") notFound();
  // Outside the customer layouts, so it starts the session itself.
  return (
    <GuestSessionProvider>
      <SupabaseCheck />
    </GuestSessionProvider>
  );
}
