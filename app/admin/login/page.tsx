import type { Metadata } from "next";
import { AdminLoginForm } from "./AdminLoginForm";

export const metadata: Metadata = { title: "Sign in" };

/** Admin sign-in — email and password, for staff accounts only. */
export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <AdminLoginForm />
    </main>
  );
}
