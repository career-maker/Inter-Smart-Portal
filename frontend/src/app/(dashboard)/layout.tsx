"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import {
  LogOut, Menu, X, ChevronRight, Home, ChevronDown,
  LayoutDashboard, CalendarCheck, Briefcase, UserCircle,
  Users, ShieldCheck
} from "lucide-react";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { RecognitionTicker } from "@/components/layout/RecognitionTicker";
import { BirthdayTicker } from "@/components/layout/BirthdayTicker";
import api from "@/services/api";
import Script from "next/script";
import ChatbaseLottieButton from "@/components/ChatbaseLottieButton";

type NavItem = {
  href: string;
  label: string;
  roles?: string[];
};

type NavGroup = {
  id: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];   // if set, only these roles see the group
  items: NavItem[];
};

type StandaloneLink = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const STANDALONE: StandaloneLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const NAV_GROUPS: NavGroup[] = [
  {
    id: "leave-wfh",
    label: "Leave & WFH",
    icon: CalendarCheck,
    items: [
      { href: "/leaves",           label: "My Leaves" },
      { href: "/leaves/apply",     label: "Apply Leave", roles: ["Employee", "Team Lead"] },
      { href: "/wfh",              label: "WFH Requests" },
      { href: "/calendar",         label: "Leave Calendar" },
      { href: "/leaves/approvals", label: "Leave Approvals", roles: ["Super Admin", "Team Lead"] },
    ],
  },
  {
    id: "hr-services",
    label: "HR Services",
    icon: Briefcase,
    items: [
      { href: "/announcements", label: "Updates & Announcements" },
      { href: "/documents",     label: "Request Documents" },
      { href: "/policies",      label: "HR Policies" },
      { href: "/holidays",      label: "Holidays", roles: ["Super Admin", "HR"] },
    ],
  },
  {
    id: "my-account",
    label: "My Account",
    icon: UserCircle,
    items: [
      { href: "/attendance",     label: "Attendance", roles: ["Employee", "Team Lead"] },
      { href: "/notifications",  label: "Notifications" },
      { href: "/issues",         label: "Raise an Issue" },
    ],
  },
  {
    id: "people",
    label: "People & Teams",
    icon: Users,
    items: [
      { href: "/employees",        label: "Employees",            roles: ["Super Admin", "HR"] },
      { href: "/teams",            label: "Departments",          roles: ["Super Admin", "HR"] },
      { href: "/hall",             label: "The Hall" },
      { href: "/birthday-wishes",  label: "Birthday Wishes" },
      { href: "/leaves/approvals", label: "Leave Approvals",      roles: ["HR"] },
      { href: "/leaves/approvals", label: "My Requests",          roles: ["Employee"] },
      { href: "/recognitions",     label: "Manage Awards",        roles: ["Super Admin"] },
      { href: "/recognitions/leaderboard", label: "Recognition Leaderboard" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    icon: ShieldCheck,
    roles: ["Super Admin"],
    items: [
      { href: "/profile-requests", label: "Profile Approvals" },
      { href: "/leave-balances", label: "Leave Balances" },
      { href: "/attendance/management", label: "Attendance Management" },
      { href: "/reports",        label: "Reports" },
      { href: "/audit-logs",     label: "Audit Logs" },
      { href: "/settings",       label: "Settings" },
    ],
  },
];

function isItemVisible(item: NavItem, role: string) {
  if (item.roles && !item.roles.includes(role)) return false;
  return true;
}

function groupHasVisibleItems(group: NavGroup, role: string) {
  if (group.roles && !group.roles.includes(role)) return false;
  return group.items.some((item) => isItemVisible(item, role));
}

function pathBelongsToGroup(group: NavGroup, pathname: string) {
  return group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  // Determine which group should start open based on current path
  useEffect(() => {
    const active = NAV_GROUPS.find((g) => pathBelongsToGroup(g, pathname));
    if (active) setOpenGroup(active.id);
  }, [pathname]);

  useEffect(() => {
    setIsHydrated(useAuthStore.persist.hasHydrated());
    const unsub = useAuthStore.persist.onFinishHydration(() => setIsHydrated(true));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) router.push("/login");
  }, [isHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    api.get("/me").then((res) => {
      if (res.data?.user) updateUser(res.data.user);
    }).catch(() => {});
  }, [isHydrated, isAuthenticated]);

  if (!isHydrated || !isAuthenticated) return null;

  const userRole = user?.role ?? "";

  const handleLogout = () => {
    logout();
    localStorage.removeItem("token");
    router.push("/login");
    import("@/services/api").then(({ default: api }) => {
      api.post("/logout").catch(() => {});
    });
  };

  const toggleGroup = (id: string) => {
    setOpenGroup((prev) => (prev === id ? null : id));
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <BirthdayTicker />
      <RecognitionTicker />
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center shrink-0 pr-4">
            <img src="/logo.png" alt="Intersmart Logo" className="h-10 w-auto object-contain" />
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <NotificationDropdown />

            {/* User info (desktop) */}
            <Link href="/profile" className="hidden sm:flex items-center gap-3 hover:opacity-85 transition-opacity cursor-pointer">
              <div className="flex flex-col items-end text-right">
                <span className="text-sm font-medium leading-none text-white">
                  {user?.first_name} {user?.last_name}
                </span>
                <span className="text-xs text-slate-400 mt-0.5">{user?.role}</span>
              </div>
              <div className="w-8 h-8 rounded-full border border-white/10 bg-amber-400 overflow-hidden flex items-center justify-center text-xs font-bold text-white relative shrink-0">
                <span>{user?.first_name?.[0]}{user?.last_name?.[0]}</span>
                {user?.profile_photo_path && (
                  <img
                    src={user.profile_photo_path}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                )}
              </div>
            </Link>

            {/* Logout (desktop) */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>

            {/* Hamburger */}
            <button
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-6 w-6 text-slate-300" /> : <Menu className="h-6 w-6 text-slate-300" />}
            </button>
          </div>
        </div>

        {/* ── Grouped navigation dropdown ── */}
        {menuOpen && (
          <>
            {/* Backdrop for mobile */}
            <div
              className="fixed inset-0 top-16 bg-black/30 z-30 md:hidden"
              onClick={closeMenu}
            />
            <div className="absolute top-16 right-0 w-full md:w-80 bg-slate-900 border-l border-b border-white/10 shadow-2xl z-40 max-h-[calc(100vh-4rem)] overflow-y-auto">

              {/* User info for mobile */}
              <Link
                href="/profile"
                onClick={closeMenu}
                className="sm:hidden px-4 py-4 border-b border-white/10 flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-amber-400 overflow-hidden flex items-center justify-center text-sm font-bold text-white relative shrink-0">
                  <span>{user?.first_name?.[0]}{user?.last_name?.[0]}</span>
                  {user?.profile_photo_path && (
                    <img
                      src={user.profile_photo_path}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs text-slate-400">{user?.role}</p>
                </div>
              </Link>

              <nav className="py-2">
                {/* Standalone links */}
                {STANDALONE.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeMenu}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors mx-2 rounded-xl ${
                        active
                          ? "bg-amber-500/20 text-amber-400"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  );
                })}

                {/* Grouped sections */}
                {NAV_GROUPS.map((group) => {
                  if (!groupHasVisibleItems(group, userRole)) return null;

                  const visibleItems = group.items.filter((item) => isItemVisible(item, userRole));
                  const isOpen = openGroup === group.id;
                  const groupActive = pathBelongsToGroup(group, pathname);
                  const GroupIcon = group.icon;

                  return (
                    <div key={group.id} className="mt-1">
                      {/* Group header */}
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-semibold transition-colors mx-2 rounded-xl ${
                          groupActive && !isOpen
                            ? "text-amber-400"
                            : "text-slate-300 hover:text-white hover:bg-white/5"
                        }`}
                        style={{ width: "calc(100% - 1rem)" }}
                      >
                        <span className="flex items-center gap-3">
                          <GroupIcon className="h-4 w-4 shrink-0" />
                          {group.label}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Group items */}
                      {isOpen && (
                        <div className="mt-0.5 mb-1">
                          {visibleItems.map((item) => {
                            const hasExactMatch = visibleItems.some((i) => pathname === i.href);
                            const active = hasExactMatch
                              ? pathname === item.href
                              : pathname === item.href ||
                                (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeMenu}
                                className={`flex items-center gap-2 pl-11 pr-4 py-2 text-sm transition-colors mx-2 rounded-xl ${
                                  active
                                    ? "bg-amber-500/20 text-amber-400 font-semibold"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                                }`}
                                style={{ width: "calc(100% - 1rem)" }}
                              >
                                <span className="w-1 h-1 rounded-full bg-current shrink-0 opacity-60" />
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Divider + Logout (mobile) */}
                <div className="mt-2 pt-2 border-t border-white/10 sm:hidden">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 text-sm text-red-400 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors mx-2"
                    style={{ width: "calc(100% - 1rem)" }}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </nav>
            </div>
          </>
        )}
      </header>

      <main className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* Breadcrumbs */}
        {pathname !== "/dashboard" && (
          <div className="flex items-center flex-wrap gap-2 text-sm text-slate-400 mb-6 font-medium">
            <Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
            {pathname
              .split("/")
              .filter(Boolean)
              .map((segment, index, array) => {
                const href = "/" + array.slice(0, index + 1).join("/");
                const isLast = index === array.length - 1;
                const title =
                  segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
                return (
                  <div key={segment + index} className="flex items-center gap-2">
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
      {/* Chatbase AI Assistant Widget — hidden default bubble, custom Lottie button below */}
      <Script
        id="chatbase-embed"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.chatbaseConfig = { chatbotId: "NWjkUsLKs1X83cNdAnodJ" };
            (function() {
              var s = document.createElement("script");
              s.src = "https://www.chatbase.co/embed.min.js";
              s.setAttribute("chatbotId", "NWjkUsLKs1X83cNdAnodJ");
              s.setAttribute("domain", "www.chatbase.co");
              s.defer = true;
              document.body.appendChild(s);
            })();
          `,
        }}
      />
      <ChatbaseLottieButton />
    </div>
  );
}
