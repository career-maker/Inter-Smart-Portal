"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { LogOut, ChevronDown, Menu, X, ChevronRight, Home } from "lucide-react";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { RecognitionTicker } from "@/components/layout/RecognitionTicker";

const NAV_LINKS = [
  { href: "/dashboard",        label: "Dashboard" },
  { href: "/attendance",       label: "Attendance" },
  { href: "/announcements",    label: "Updates" },
  { href: "/employees",        label: "Employees" },
  { href: "/teams",            label: "Departments" },
  { href: "/leaves",           label: "Leaves" },
  { href: "/leaves/apply",     label: "Apply Leave",      roles: ['Employee', 'Team Lead'] },
  { href: "/wfh",              label: "WFH" },
  { href: "/leaves/approvals", label: "Approvals" },
  { href: "/documents",        label: "Documents" },
  { href: "/policies",         label: "Policies" },
  { href: "/reports",          label: "Reports" },
  { href: "/hall",             label: "The Hall" },
  { href: "/calendar",         label: "Calendar" },
  { href: "/holidays",         label: "Holidays" },
  { href: "/issues",           label: "Raise an Issue" },
  { href: "/recognitions",     label: "Employee Recognitions" },
  { href: "/leave-balances",   label: "Leave Balances",   roles: ['Super Admin'] },
  { href: "/settings",         label: "Settings",         roles: ['Super Admin'] },
  { href: "/audit-logs",       label: "Audit Logs",       roles: ['Super Admin'] },
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

  const handleLogout = () => {
    logout();
    localStorage.removeItem("token");
    router.push("/login");
    
    // Fire and forget API call so UI doesn't hang
    import("@/services/api").then(({ default: api }) => {
      api.post("/logout").catch(() => {});
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <RecognitionTicker />
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center shrink-0 pr-4">
            <img src="/logo.png" alt="Intersmart Logo" className="h-10 w-auto object-contain" />
          </Link>

          {/* User Menu */}
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <NotificationDropdown />
            
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium leading-none">
                  {user?.first_name} {user?.last_name}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">{user?.role}</span>
              </div>
              <img 
                src={user?.profile_photo_path || `https://ui-avatars.com/api/?name=${user?.first_name}+${user?.last_name}&background=f4b400&color=fff`} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
              />
            </div>
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
            {/* Universal Hamburger menu toggle */}
            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6 text-gray-700" /> : <Menu className="h-6 w-6 text-gray-700" />}
            </button>
          </div>
        </div>

        {/* Universal Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-16 right-0 w-full md:w-80 bg-white border-b md:border-l md:border-b shadow-lg z-40 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {NAV_LINKS.filter(link => {
              // Role-restricted links defined inline
              if (link.roles) {
                return link.roles.includes(user?.role ?? '');
              }
              // Legacy restrictions
              if (link.href === '/holidays' || link.href === '/reports') {
                return user?.role === 'Super Admin' || user?.role === 'HR';
              }
              if (link.href === '/profile-requests' || link.href === '/recognitions') {
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
                  className={`text-sm font-medium px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <div className="sm:hidden col-span-full mt-2 pt-2 border-t">
               <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-red-600 transition-colors px-4 py-3 rounded-lg hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
               </button>
            </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
        {pathname !== '/dashboard' && (
          <div className="flex items-center flex-wrap gap-2 text-sm text-slate-400 mb-6 font-medium">
            <Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
            {pathname.split('/').filter(p => p).map((path, index, array) => {
              const href = '/' + array.slice(0, index + 1).join('/');
              const isLast = index === array.length - 1;
              const title = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
              
              return (
                <div key={path} className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                  {isLast ? (
                    <span className="text-white">{title}</span>
                  ) : (
                    <Link href={href} className="hover:text-white transition-colors">
                      {title}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
