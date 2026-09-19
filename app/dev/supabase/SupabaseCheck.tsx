"use client";

import { useState } from "react";
import { useGuestSession } from "@/components/providers/GuestSessionProvider";
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
      return { ok: false, message: `Reached Supabase, but the request was refused (HTTP ${status}).` };
    }
    if (status === 404 || error.code === "PGRST205" || error.code === "42P01") {
      return { ok: true, message: "Connected, but the brands table was not found — apply the migration first." };
    }
    return { ok: false, message: `Supabase responded with an error (HTTP ${status}): ${error.message}` };
  } catch (err) {
    return { ok: false, message: `Could not reach Supabase: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Read-only: does the signed-in (guest) user have a profile row? */
async function checkProfile(userId: string): Promise<Result> {
  const { data, error } = await getSupabaseClient().from("profiles").select("id").eq("id", userId).maybeSingle();
  if (error) return { ok: false, message: `Could not read the profile: ${error.message}` };
  return data
    ? { ok: true, message: "Profile exists for this user." }
    : { ok: false, message: "No profile row for this user." };
}

function Status({ result }: { result: Result }) {
  return <p className={result.ok ? "text-success" : "text-danger"}>{result.message}</p>;
}

export function SupabaseCheck() {
  const { state: session, retry } = useGuestSession();
  const [connection, setConnection] = useState<Result | null>(null);
  const [profile, setProfile] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setConnection(await checkConnection());
    setProfile(session.status === "ready" ? await checkProfile(session.session.user.id) : null);
    setRunning(false);
  }

  return (
    <main className="flex flex-col gap-4 px-gutter py-8">
      <h1 className="text-heading font-semibold">Supabase connection</h1>
      <p className="text-secondary text-ink/60">
        Development only. Sends read-only requests; nothing is written.
      </p>

      <section aria-labelledby="dev-session" className="flex flex-col gap-1">
        <h2 id="dev-session" className="font-medium">
          Guest session
        </h2>
        <div role="status" data-testid="session-status">
          {session.status === "loading" && <p className="text-ink/60">Starting guest session…</p>}
          {session.status === "error" && (
            <>
              <p className="text-danger">{session.message}</p>
              <button type="button" onClick={retry} className="mt-2 underline">
                Try again
              </button>
            </>
          )}
          {session.status === "ready" && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-[15px]">
              <dt className="text-ink/60">Session</dt>
              <dd className="text-success">{session.session.user.is_anonymous ? "Anonymous" : "Signed in"}</dd>
              <dt className="text-ink/60">User id</dt>
              <dd data-testid="user-id" className="[overflow-wrap:anywhere]">
                {session.session.user.id}
              </dd>
            </dl>
          )}
        </div>
      </section>

      <button
        type="button"
        onClick={run}
        disabled={running || session.status === "loading"}
        className="h-12 rounded-full bg-ink text-white disabled:opacity-50"
      >
        {running ? "Checking…" : "Run check"}
      </button>
      {connection && (
        <div data-testid="connection-result">
          <Status result={connection} />
        </div>
      )}
      {profile && (
        <div data-testid="profile-result">
          <Status result={profile} />
        </div>
      )}
    </main>
  );
}
