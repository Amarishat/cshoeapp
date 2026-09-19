"use client";

import { useEffect, useState } from "react";

export type CatalogueLoadState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

/**
 * Runs a Supabase catalogue loader in the browser, with loading / error
 * states and a retry. Errors are surfaced as-is — never replaced with mock
 * data. `load` must be a stable (module-level) function.
 */
export function useCatalogueLoad<T>(load: () => Promise<T>) {
  const [state, setState] = useState<CatalogueLoadState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [load, attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  return { state, retry };
}
