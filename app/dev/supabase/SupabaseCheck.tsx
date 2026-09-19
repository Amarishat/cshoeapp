"use client";

import { useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

type Result = { ok: boolean; message: string };

/**
 * Read-only connection check: a HEAD request for the row count of the public
 * `brands` table. It never writes, and never shows keys.
 */
async function checkConnection(): Promise<Result> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart the dev server.",
    };
  }
  try {
    const { count, error, status } = await getSupabaseClient()
      .from("brands")
      .select("id", { count: "exact", head: true });
    if (!error) return { ok: true, message: `Connected. brands table readable (${count ?? 0} rows).` };
    if (status === 401 || status === 403) {
      return { ok: false, message: `Reached Supabase, but the key was rejected (HTTP ${status}).` };
    }
    if (status === 404 || error.code === "PGRST205" || error.code === "42P01") {
      return { ok: true, message: "Connected, but the brands table was not found — apply the migration first." };
    }
    return { ok: false, message: `Supabase responded with an error (HTTP ${status}): ${error.message}` };
  } catch (err) {
    return { ok: false, message: `Could not reach Supabase: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export function SupabaseCheck() {
  const [result, setResult] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setResult(await checkConnection());
    setRunning(false);
  }

  return (
    <main className="flex flex-col gap-4 px-gutter py-8">
      <h1 className="text-heading font-semibold">Supabase connection</h1>
      <p className="text-secondary text-ink/60">
        Development only. Sends one read-only request; nothing is written.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="h-12 rounded-full bg-ink text-white disabled:opacity-50"
      >
        {running ? "Checking…" : "Run check"}
      </button>
      {result && (
        <p role="status" className={result.ok ? "text-success" : "text-danger"}>
          {result.message}
        </p>
      )}
    </main>
  );
}
