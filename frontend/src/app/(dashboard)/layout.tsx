"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { LogOut, ChevronDown, Menu, X } from "lucide-react";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";

const NAV_LINKS = [
  { href: "/dashboard",        label: "Dashboard" },
  { href: "/attendance",       label: "Attendance" },
  { href: "/announcements",    label: "Updates" },
  { href: "/employees",        label: "Employees" },
  { href: "/teams",            label: "Teams" },
  { href: "/leaves",           label: "Leaves" },
  { href: "/wfh",              label: "WFH" },
  { href: "/leaves/approvals", label: "Approvals" },
  { href: "/documents",        label: "Documents" },
  { href: "/policies",         label: "Policies" },
  { href: "/reports",          label: "Reports" },
  { href: "/hall",             label: "The Hall" },
  { href: "/calendar",         label: "Calendar" },
  { href: "/holidays",         label: "Holidays" },
  { href: "/settings",         label: "Settings" },
  { href: "/audit-logs",       label: "Audit Logs" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsHydrated(useAuthStore.persist.hasHydrated());
    const unsub = useAuthStore.persist.onFinishHydration(() => setIsHydrated(true));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated) return null;
  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    try {
      const api = (await import("@/services/api")).default;
      await api.post("/logout");
    } catch (_) {}
    logout();
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50/30">
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center shrink-0 pr-4">
            <img src="/logo.png" alt="Intersmart Logo" className="h-10 w-auto object-contain" />
          </Link>

          {/* Desktop Nav — scrollable */}
          <nav className="hidden md:flex gap-1 overflow-x-auto flex-1 mx-4 no-scrollbar">
            {NAV_LINKS.filter(link => {
              if (link.href === '/hall') {
                return user?.role === 'Super Admin' || user?.role === 'Team Lead';
              }
              if (link.href === '/holidays' || link.href === '/reports') {
                return user?.role === 'Super Admin' || user?.role === 'HR';
              }
              if (link.href === '/settings' || link.href === '/audit-logs') {
                return user?.role === 'Super Admin';
              }
              return true;
            }).map(({ href, label }) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3 shrink-0">
            <NotificationDropdown />
            
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium leading-none">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">{user?.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white px-4 pb-3 grid grid-cols-2 gap-1">
            {NAV_LINKS.filter(link => {
              if (link.href === '/hall') {
                return user?.role === 'Super Admin' || user?.role === 'Team Lead';
              }
              if (link.href === '/holidays' || link.href === '/reports') {
                return user?.role === 'Super Admin' || user?.role === 'HR';
              }
              if (link.href === '/settings' || link.href === '/audit-logs') {
                return user?.role === 'Super Admin';
              }
              return true;
            }).map(({ href, label }) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      <main className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
