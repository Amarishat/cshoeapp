"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ensureGuestSession } from "@/lib/supabase/guestSession";

export type GuestSessionState =
  | { status: "loading" }
  | { status: "ready"; session: Session }
  | { status: "error"; message: string };

const GuestSessionContext = createContext<{ state: GuestSessionState; retry: () => void } | null>(null);

/**
 * Starts the anonymous Supabase guest session once when the app loads and
 * shares its state. It renders nothing itself and never blocks the V1 UI;
 * code that reads user data should wait for `status === "ready"` (or await
 * ensureGuestSession()).
 */
export function GuestSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GuestSessionState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    ensureGuestSession()
      .then((session) => {
        if (!cancelled) setState({ status: "ready", session });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        // No UI in V1 shows this yet, so make the failure visible to developers.
        console.error(`[guest session] ${message}`);
        if (!cancelled) setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  return <GuestSessionContext.Provider value={{ state, retry }}>{children}</GuestSessionContext.Provider>;
}

/** The guest session state (must be inside <GuestSessionProvider>). */
export function useGuestSession() {
  const value = useContext(GuestSessionContext);
  if (!value) throw new Error("useGuestSession must be used inside <GuestSessionProvider>.");
  return value;
}
