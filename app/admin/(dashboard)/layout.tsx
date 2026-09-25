import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminMobileHeader, AdminSidebar } from "@/components/admin/AdminSidebar";

/**
 * The signed-in admin screens: sidebar plus the page, behind the admin guard.
 * Below 768px the sidebar gives way to a top bar with a menu drawer, so the
 * page gets the full width. /admin/login sits outside this group, so it stays
 * reachable when signed out.
 */
export default function AdminDashboardLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AdminGuard>
      <div className="flex min-h-dvh flex-col md:flex-row">
        <AdminMobileHeader />
        <AdminSidebar />
        {/* min-w-0 lets wide content (tables, charts) shrink or scroll inside instead of pushing the page wider. */}
        <main className="min-w-0 flex-1 bg-backdrop p-4 md:p-10">{children}</main>
      </div>
    </AdminGuard>
  );
}
