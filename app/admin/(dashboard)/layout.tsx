import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

/**
 * The signed-in admin screens: sidebar plus the page, behind the admin guard.
 * /admin/login sits outside this group, so it stays reachable when signed out.
 */
export default function AdminDashboardLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AdminGuard>
      <div className="flex min-h-dvh">
        <AdminSidebar />
        <main className="flex-1 bg-backdrop p-10">{children}</main>
      </div>
    </AdminGuard>
  );
}
