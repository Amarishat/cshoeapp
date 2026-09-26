import type { Metadata } from "next";
import { AdminLoginForm } from "./AdminLoginForm";

export const metadata: Metadata = { title: "Sign in" };

/** Why the admin was sent here (set by AdminGuard), as a line above the form. */
const NOTICES: Record<string, string> = {
  expired: "Your session has expired. Please sign in again.",
  denied: "Your account no longer has admin access.",
};

/** Admin sign-in — email and password, for staff accounts only. */
export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { reason } = await searchParams;
  const notice = typeof reason === "string" ? NOTICES[reason] : undefined;

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <AdminLoginForm notice={notice} />
    </main>
  );
}
