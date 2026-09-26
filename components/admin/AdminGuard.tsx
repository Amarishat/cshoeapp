"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CatalogueError } from "@/components/product/CatalogueStatus";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

type Access = { status: "checking" } | { status: "allowed" } | { status: "error"; message: string };

/**
 * Lets only a signed-in admin through, and keeps checking while the admin
 * screens are open:
 *
 * - on first load ("Checking access…" until it's known);
 * - whenever the signed-in session ends (it expired, or was signed out in
 *   another tab) — the page is hidden at once and the admin is sent to
 *   /admin/login?reason=expired;
 * - when the tab becomes visible again, and on every move between admin
 *   pages — if the account is no longer an admin (is_admin() says false) it is
 *   signed out and sent to /admin/login?reason=denied.
 *
 * A check that fails for another reason (network, server) signs no one out:
 * the page is hidden behind a "Try again" instead, since access is unknown.
 * The database enforces admin access on every read and write regardless; this
 * keeps the screens from showing data, or accepting edits, past that point.
 *
 * Uses the admin Supabase client only — its session is stored apart from the
 * customer's, so the guest session is never read or signed out here. Never
 * calls ensureGuestSession(), which would create a guest user on an admin route.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [access, setAccess] = useState<Access>({ status: "checking" });
  // Only the latest check may act (a slow one mustn't overrule a newer one).
  const latest = useRef(0);
  // Set once we're sending the admin away, so nothing else acts afterwards.
  const leaving = useRef(false);
  // The first check sends a missing session to sign-in without a reason, as before.
  const firstCheck = useRef(true);

  const leave = useCallback(
    (reason: "expired" | "denied" | null) => {
      if (leaving.current) return;
      leaving.current = true;
      setAccess({ status: "checking" });
      router.replace(reason ? `/admin/login?reason=${reason}` : "/admin/login");
    },
    [router],
  );

  const check = useCallback(async () => {
    if (leaving.current) return;
    const run = ++latest.current;
    const initial = firstCheck.current;
    firstCheck.current = false;
    const auth = getAdminSupabaseClient().auth;

    const { data, error } = await auth.getSession();
    if (run !== latest.current || leaving.current) return;
    if (error) {
      setAccess({ status: "error", message: error.message });
      return;
    }
    if (!data.session) {
      leave(initial ? null : "expired");
      return;
    }

    const { data: isAdmin, error: checkError } = await getAdminSupabaseClient().rpc("is_admin");
    if (run !== latest.current || leaving.current) return;
    if (checkError) {
      // Unknown, not refused: keep the session, hide the page, offer a retry.
      setAccess({ status: "error", message: checkError.message });
      return;
    }
    if (isAdmin !== true) {
      // Explicitly not an admin: sign out of the admin client (our own
      // SIGNED_OUT is ignored, since we're already leaving), then go.
      leave("denied");
      await auth.signOut();
      return;
    }
    setAccess({ status: "allowed" });
  }, [leave]);

  // First check, and again on every move between admin pages. Started as a
  // task (it only sets state after asking Supabase anyway), not in the effect body.
  useEffect(() => {
    void Promise.resolve().then(check);
  }, [check, pathname]);

  // The session ending (expired, or signed out elsewhere) hides the page at once.
  useEffect(() => {
    // Only SIGNED_OUT: the INITIAL_SESSION event sent on subscribing is the
    // first check's job (no session then means "sign in", not "expired").
    const { data } = getAdminSupabaseClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") leave("expired");
    });
    return () => data.subscription.unsubscribe();
  }, [leave]);

  // Coming back to the tab re-checks, in case access changed meanwhile.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void check();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [check]);

  if (access.status === "error") {
    return (
      <div className="p-10">
        <CatalogueError
          title="Couldn’t check your admin access."
          message={access.message}
          onRetry={() => {
            setAccess({ status: "checking" });
            void check();
          }}
        />
      </div>
    );
  }
  if (access.status !== "allowed") {
    return (
      <p role="status" className="p-10 text-secondary text-ink/60">
        Checking access…
      </p>
    );
  }
  return <>{children}</>;
}
