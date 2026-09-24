"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

/** One message for a wrong email or a wrong password, so neither can be probed. */
const WRONG_DETAILS = "Those details don’t match an account.";
const NOT_ADMIN = "That account doesn’t have admin access.";

/**
 * Admin sign-in, with email and password. Uses the admin Supabase client, whose
 * session is stored apart from the customer's guest session, so signing in
 * here never replaces (or signs out) the storefront's guest. A signed-in
 * account that isn't an admin is signed straight back out of the admin client.
 */
export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  async function signIn() {
    if (signingIn) return;
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setSigningIn(true);
    const auth = getAdminSupabaseClient().auth;
    try {
      const { error: signInError } = await auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.status === 400 ? WRONG_DETAILS : signInError.message);
        return;
      }

      // Signed in — but only an admin may go on (public.is_admin()).
      const { data: isAdmin, error: checkError } = await getAdminSupabaseClient().rpc("is_admin");
      if (checkError) {
        await auth.signOut();
        setError(`Could not check your access: ${checkError.message}`);
        return;
      }
      if (!isAdmin) {
        await auth.signOut();
        setError(NOT_ADMIN);
        return;
      }

      router.replace("/admin");
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : String(thrown));
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void signIn();
      }}
      className="w-full max-w-[420px] rounded-card bg-page p-8 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_30px_rgba(0,0,0,0.08)]"
    >
      <h1 className="text-heading font-semibold">Cshoe Admin</h1>
      <p className="mt-2 text-secondary text-ink/60">Sign in to manage the catalogue.</p>

      <div className="mt-8 flex flex-col gap-6">
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="mt-6 text-secondary text-danger [overflow-wrap:anywhere]">
          {error}
        </p>
      )}

      <Button type="submit" size="md" disabled={signingIn} className="mt-8 w-full">
        {signingIn ? "Signing in…" : "Log in"}
      </Button>
    </form>
  );
}
