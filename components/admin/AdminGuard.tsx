"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Lets only a signed-in admin through. No session goes to the sign-in page;
 * a session that isn't an admin's (a customer's, or a leftover guest one) is
 * signed out first, so the admin screens can never be reached with it.
 *
 * Uses the Supabase client directly — never ensureGuestSession(), which would
 * create a guest user on an admin route.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const auth = getSupabaseClient().auth;
      const { data, error } = await auth.getSession();
      if (cancelled) return;

      if (error || !data.session) {
        router.replace("/admin/login");
        return;
      }

      const { data: isAdmin, error: checkError } = await getSupabaseClient().rpc("is_admin");
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
