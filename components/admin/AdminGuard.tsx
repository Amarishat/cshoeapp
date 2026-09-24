"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

/**
 * Lets only a signed-in admin through. No session goes to the sign-in page;
 * an admin-client session that isn't an admin's is signed out first, so the
 * admin screens can never be reached with it.
 *
 * Uses the admin Supabase client only — its session is stored apart from the
 * customer's, so the guest session is never read or signed out here. Never
 * calls ensureGuestSession(), which would create a guest user on an admin route.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const auth = getAdminSupabaseClient().auth;
      const { data, error } = await auth.getSession();
      if (cancelled) return;

      if (error || !data.session) {
        router.replace("/admin/login");
        return;
      }

      const { data: isAdmin, error: checkError } = await getAdminSupabaseClient().rpc("is_admin");
      if (cancelled) return;

      if (checkError || !isAdmin) {
        await auth.signOut();
        if (!cancelled) router.replace("/admin/login");
        return;
      }
      setAllowed(true);
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!allowed) {
    return (
      <p role="status" className="p-10 text-secondary text-ink/60">
        Checking access…
      </p>
    );
  }
  return <>{children}</>;
}
