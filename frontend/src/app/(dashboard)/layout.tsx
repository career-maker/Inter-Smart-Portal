"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import {
  LogOut, Menu, X, ChevronRight, Home, ChevronDown,
  LayoutDashboard, CalendarCheck, Briefcase, UserCircle,
  Users, ShieldCheck, PanelLeftClose, PanelLeftOpen,
  FolderKanban, CheckSquare, Clock, Building2, HeartHandshake, HelpCircle,
  Search, Rocket, Bell, Settings
} from "lucide-react";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { RecognitionTicker } from "@/components/layout/RecognitionTicker";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { FavoritesNav } from "@/components/layout/FavoritesNav";
import { CommandPalette } from "@/components/CommandPalette";
import api from "@/services/api";
import Script from "next/script";
import ChatbaseLottieButton from "@/components/ChatbaseLottieButton";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";

type NavItem = {
  href: string;
  label: string;
  roles?: string[];
  external?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  shortLabel?: string;
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
  { href: "/dashboard", label: "Home", icon: Home },
];

const NAV_GROUPS: NavGroup[] = [
  {
    id: "leave-wfh",
    label: "Leave & WFH",
    shortLabel: "Leave",
    icon: CalendarCheck,
    items: [
      { href: "/leaves",           label: "All Leaves", roles: ["Super Admin"] },
      { href: "/leaves",           label: "My Leaves", roles: ["Employee", "Team Lead", "HR"] },
      { href: "/leaves/apply",     label: "Apply Leave", roles: ["Employee", "Team Lead"] },
      { href: "/wfh",              label: "WFH Requests" },
      { href: "/calendar",         label: "Leave Calendar" },
      { href: "/holidays",         label: "Holidays", roles: ["Super Admin", "HR"] },
      { href: "/leaves/approvals", label: "Leave Approvals", roles: ["Super Admin", "Team Lead"] },
      { href: "/leave-balances",   label: "Leave Balances", roles: ["Super Admin"] },
      { href: "/manage-leaves",    label: "Manage Approved Leaves/WFH", roles: ["Super Admin"] },
    ],
  },
  {
    id: "project-management",
    label: "Project Management",
    shortLabel: "Projects",
    icon: FolderKanban,
    items: [
      { href: "/project-management",          label: "Overview" },
      { href: "/project-management/projects",  label: "Projects" },
      { href: "/project-management/tasks",     label: "All Tasks", roles: ["Super Admin", "Team Lead"] },
      { href: "/project-management/tasks/my",  label: "My Tasks" },
      { href: "/project-management/task-catalog", label: "Task Catalog", roles: ["Super Admin", "HR"] },
    ],
  },
  {
    id: "ta",
    label: "Travel Allowance",
    shortLabel: "Finances",
    icon: Briefcase,
    roles: ["Employee", "Team Lead", "Super Admin"],
    items: [
      { href: "/ta/apply",        label: "Apply for TA", roles: ["Employee", "Team Lead"] },
      { href: "/ta/status",       label: "TA Status", roles: ["Employee", "Team Lead"] },
      { href: "/ta/management",   label: "Manage TA Requests", roles: ["Super Admin"] },
    ],
  },
  {
    id: "hr-services",
    label: "HR Services",
    shortLabel: "Services",
    icon: Building2,
    items: [
      { href: "/announcements", label: "Updates & Announcements" },
      { href: "/documents",     label: "Request Documents" },
      { href: "/policies",      label: "HR Policies" },
    ],
  },
  {
    id: "people",
    label: "People & Teams",
    shortLabel: "Org",
    icon: Users,
    items: [
      { href: "/employees",        label: "Employees",            roles: ["Super Admin", "HR"] },
      { href: "/teams",            label: "Departments",          roles: ["Super Admin", "HR"] },
      { href: "/attendance/management", label: "Attendance Management", roles: ["Super Admin"] },
      { href: "/hall",             label: "The Hall" },
      { href: "/birthday-wishes",  label: "Birthday Wishes" },
      { href: "/leaves/approvals", label: "Leave Approvals",      roles: ["HR"] },
      { href: "/leaves/approvals", label: "My Requests",          roles: ["Employee"] },
      { href: "/recognitions",     label: "Manage Awards",        roles: ["Super Admin"] },
      { href: "/recognitions/leaderboard", label: "Recognition Leaderboard" },
      { href: "https://qa-tracker-pro.vercel.app/", label: "Team Tracker", roles: ["Team Lead"], external: true },
    ],
  },
  {
    id: "my-account",
    label: "My Account",
    shortLabel: "Account",
    icon: UserCircle,
    items: [
      { href: "/notifications",  label: "Notifications" },
      { href: "/issues",         label: "Raise an Issue" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    shortLabel: "Admin",
    icon: ShieldCheck,
    roles: ["Super Admin"],
    items: [
      { href: "/profile-requests", label: "Profile Approvals" },
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
  const isDark = useThemeStore((state) => state.isDark);
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  
  // Search Modal & Flyout State
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [flyoutState, setFlyoutState] = useState<{ groupId: string; top: number } | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const flyoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch pending approvals for Team Leads
  useEffect(() => {
    if (user?.role === "Team Lead") {
      const fetchPendingCount = async () => {
        try {
          const res = await api.get("/leave-requests?status=Pending");
          setPendingApprovalsCount(res.data.data?.data?.length ?? 0);
        } catch (e) {
          console.error("Failed to fetch pending approvals", e);
        }
      };
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.role]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button[aria-label="Toggle menu"]')) return;
      if (target.closest('[role="navigation"]') || target.closest('.fixed.inset-0')) return;

      setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Close flyout on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#light-theme-sidebar') && !target.closest('#light-theme-flyout-portal')) {
        setFlyoutState(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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

  // Force hide scrollbar during hydration on mobile
  useEffect(() => {
    if (!isHydrated) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isHydrated]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) router.push("/login");
  }, [isHydrated, isAuthenticated, router]);

  // Refresh user profile once on initial authenticated load only
  const [meFetched, setMeFetched] = useState(false);
  useEffect(() => {
    if (!isHydrated || !isAuthenticated || meFetched) return;
    setMeFetched(true);
    api.get("/me").then((res) => {
      if (res.data?.user) updateUser(res.data.user);
    }).catch(() => {});
  }, [isHydrated, isAuthenticated]);

  if (!isHydrated) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col overflow-hidden z-[9999]">
        <div className="h-16 bg-slate-900 border-b border-white/10" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 opacity-60">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

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

  const handleLightGroupMouseEnter = (groupId: string, e: React.MouseEvent<HTMLElement>) => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setFlyoutState({ groupId, top: Math.max(10, rect.top) });
  };

  const handleLightGroupMouseLeave = () => {
    flyoutTimeoutRef.current = setTimeout(() => {
      setFlyoutState(null);
    }, 250);
  };

  const handleLightFlyoutMouseEnter = () => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
  };

  const handleLightFlyoutMouseLeave = () => {
    flyoutTimeoutRef.current = setTimeout(() => {
      setFlyoutState(null);
    }, 250);
  };

  // Resolve currently open flyout group definition
  const activeFlyoutGroupObj = flyoutState ? NAV_GROUPS.find((g) => g.id === flyoutState.groupId) : null;
  const activeFlyoutVisibleItems = activeFlyoutGroupObj ? activeFlyoutGroupObj.items.filter((i) => isItemVisible(i, userRole)) : [];

  const userInitials = `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase() || "AP";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background flex">
      {/* ─────────────────────────────────────────────────────────────────────────────
          SIDEBAR - LIGHT THEME (KEKA EXACT STYLE: NAVY #0e2638, SOFT BLUE LABELS #8ea7bc,
          ACTIVE SOLID RECTANGLE #071724 WITH WHITE TEXT, CLEAN PORTAL SUBMENU, NO OUTLINES)
      ───────────────────────────────────────────────────────────────────────────── */}
      {!isDark && (
        <>
          <aside
            id="light-theme-sidebar"
            style={{
              backgroundColor: "#0e2638",
              fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            className="hidden md:flex flex-col fixed inset-y-0 left-0 z-50 w-[84px] border-r border-[#1a3a52] select-none shadow-xl overflow-hidden"
          >
            {/* Top header spacer matching 64px header height */}
            <div className="h-16 shrink-0 border-b border-[#1a3a52] bg-[#0c2233]" />

            {/* Navigation Items - Full Width Rectangles (Exact Keka Match) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <nav className="space-y-0 px-0">
                {/* Standalone Link (Home / Dashboard) */}
                {STANDALONE.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setFlyoutState(null)}
                      style={{
                        backgroundColor: active ? "#071724" : "transparent",
                        borderRadius: 0,
                      }}
                      className={`group w-full flex flex-col items-center justify-center py-3 px-1 !rounded-none transition-colors relative cursor-pointer hover:bg-[#133249] ${
                        active ? "font-semibold" : "font-normal"
                      }`}
                    >
                      <Icon
                        style={{ color: active ? "#ffffff" : "#8ea7bc" }}
                        className="w-5 h-5 mb-1 shrink-0 transition-colors group-hover:!text-white"
                      />
                      <span
                        style={{ color: active ? "#ffffff" : "#8ea7bc" }}
                        className="text-[11.5px] leading-[14px] text-center tracking-tight truncate max-w-full px-0.5 group-hover:!text-white"
                      >
                        {label}
                      </span>
                    </Link>
                  );
                })}

                {/* Nav Groups */}
                {NAV_GROUPS.map((group) => {
                  if (!groupHasVisibleItems(group, userRole)) return null;
                  const groupActive = pathBelongsToGroup(group, pathname);
                  const isFlyoutOpen = flyoutState?.groupId === group.id;
                  const isHighlighted = groupActive || isFlyoutOpen;
                  const GroupIcon = group.icon;
                  const hasBadge = group.id === "leave-wfh" && user?.role === "Team Lead" && pendingApprovalsCount > 0;

                  return (
                    <div
                      key={group.id}
                      className="relative w-full"
                      onMouseEnter={(e) => handleLightGroupMouseEnter(group.id, e)}
                      onMouseLeave={handleLightGroupMouseLeave}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          if (isFlyoutOpen) {
                            setFlyoutState(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setFlyoutState({ groupId: group.id, top: Math.max(10, rect.top) });
                          }
                        }}
                        style={{
                          backgroundColor: isHighlighted ? "#071724" : "transparent",
                          borderRadius: 0,
                        }}
                        className={`group w-full flex flex-col items-center justify-center py-3 px-1 !rounded-none transition-colors relative cursor-pointer hover:bg-[#133249] ${
                          isHighlighted ? "font-semibold" : "font-normal"
                        }`}
                      >
                        {/* Red notification badge on icon top-right */}
                        {hasBadge && (
                          <span className="absolute top-1.5 right-2 bg-[#ff5252] text-white text-[10px] font-bold rounded-full px-1.5 py-0.2 min-w-[18px] text-center shadow-md animate-pulse">
                            {pendingApprovalsCount}
                          </span>
                        )}

                        <GroupIcon
                          style={{ color: isHighlighted ? "#ffffff" : "#8ea7bc" }}
                          className="w-5 h-5 mb-1 shrink-0 transition-colors group-hover:!text-white"
                        />
                        <span
                          style={{ color: isHighlighted ? "#ffffff" : "#8ea7bc" }}
                          className="text-[11.5px] leading-[14px] text-center tracking-tight truncate max-w-full px-0.5 group-hover:!text-white"
                        >
                          {group.shortLabel || group.label}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* User Profile Mini Badge (Bottom - With Profile Photo) */}
            <div className="p-2 border-t border-[#1a3a52] shrink-0 bg-[#0c2233] flex flex-col items-center justify-center">
              <Link
                href="/profile"
                className="flex flex-col items-center justify-center p-1 rounded-none hover:bg-[#133249] transition-colors group cursor-pointer w-full"
                title={`${user?.first_name} ${user?.last_name} (${user?.role})`}
              >
                {user?.profile_photo_path ? (
                  <img
                    src={user.profile_photo_path}
                    alt={user.first_name}
                    className="w-8 h-8 rounded-full object-cover shadow-sm ring-1 ring-white/20 mb-1"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#3b82f6] text-white text-xs font-bold flex items-center justify-center mb-1 shadow-sm">
                    {userInitials}
                  </div>
                )}
                <span style={{ color: "#8ea7bc" }} className="text-[10.5px] font-medium truncate max-w-[74px] text-center group-hover:!text-white">
                  {user?.first_name}
                </span>
              </Link>
            </div>
          </aside>

          {/* ── Fixed Position Floating Submenu Flyout (High Contrast, Never Clipped) ── */}
          {flyoutState && activeFlyoutGroupObj && activeFlyoutVisibleItems.length > 0 && (
            <div
              id="light-theme-flyout-portal"
              onMouseEnter={handleLightFlyoutMouseEnter}
              onMouseLeave={handleLightFlyoutMouseLeave}
              style={{
                top: `${flyoutState.top}px`,
                backgroundColor: "#0e2638",
                borderColor: "#1a3a52",
                fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
              className="fixed left-[84px] w-64 rounded-r-xl rounded-bl-xl shadow-2xl border border-[#1a3a52] overflow-hidden z-[999] py-1.5 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Submenu Title */}
              <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#8ea7bc] border-b border-[#1a3a52] flex items-center justify-between bg-[#0a1d2c]/90">
                <span style={{ color: "#ffffff" }} className="font-bold">{activeFlyoutGroupObj.label}</span>
                <span style={{ color: "#8ea7bc" }} className="text-[10px] font-normal">Menu</span>
              </div>

              {/* Submenu Links */}
              <div className="py-1 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {activeFlyoutVisibleItems.map((item) => {
                  const hasExactMatch = activeFlyoutVisibleItems.some((i) => pathname === i.href);
                  const active = hasExactMatch
                    ? pathname === item.href
                    : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                  const isExternal = (item as any).external;

                  const itemContent = (
                    <div className="flex items-center justify-between w-full">
                      <span style={{ color: active ? "#ffffff" : "#cbd5e1" }} className="truncate font-medium group-hover:!text-white">
                        {item.label}
                      </span>
                      {item.href === "/leaves/approvals" && user?.role === "Team Lead" && pendingApprovalsCount > 0 && (
                        <span className="bg-[#ff5252] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center ml-2">
                          {pendingApprovalsCount}
                        </span>
                      )}
                      <ChevronRight style={{ color: "#8ea7bc" }} className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-1 group-hover:!text-white" />
                    </div>
                  );

                  if (isExternal) {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center px-4 py-2.5 text-[13px] hover:bg-[#163b56] transition-colors cursor-pointer"
                      >
                        {itemContent}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setFlyoutState(null)}
                      style={{
                        backgroundColor: active ? "#071724" : "transparent",
                      }}
                      className="group flex items-center px-4 py-2.5 text-[13px] hover:bg-[#163b56] transition-colors cursor-pointer"
                    >
                      {itemContent}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          SIDEBAR - DARK THEME (100% UNTOUCHED ORIGINAL WITH COLLAPSE / EXPAND DRAWER)
      ───────────────────────────────────────────────────────────────────────────── */}
      {isDark && (
        <aside className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-50 bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <div className={`h-16 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-4'} border-b border-slate-800 shrink-0 relative`}>
            {!isSidebarCollapsed && (
              <Link href="/dashboard" className="flex items-center min-w-0 pr-2">
                <img src="/logo-dark.png" alt="Inter Smart Logo" className="h-10 sm:h-12 w-auto object-contain shrink-0 max-w-[150px]" />
              </Link>
            )}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-6 h-6" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
            <nav className="space-y-6">
              {/* Standalone Links */}
              <div className="px-3">
                {STANDALONE.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors rounded-xl ${active ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`} title={isSidebarCollapsed ? label : undefined}>
                      <Icon className="h-5 w-5 shrink-0" />
                      {!isSidebarCollapsed && <span className="truncate">{label}</span>}
                    </Link>
                  );
                })}
              </div>

              {/* Nav Groups */}
              {NAV_GROUPS.map((group) => {
                if (!groupHasVisibleItems(group, userRole)) return null;
                const visibleItems = group.items.filter((item) => isItemVisible(item, userRole));
                const isOpen = openGroup === group.id;
                const groupActive = pathBelongsToGroup(group, pathname);
                const GroupIcon = group.icon;

                return (
                  <div key={group.id} className="px-3">
                    {!isSidebarCollapsed && (
                      <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {group.label}
                      </div>
                    )}
                    
                    {isSidebarCollapsed ? (
                      <button onClick={() => { setIsSidebarCollapsed(false); setOpenGroup(group.id); }} className={`w-full flex items-center justify-center p-2.5 text-sm font-semibold transition-colors rounded-xl ${groupActive ? "text-amber-400 bg-amber-500/10" : "text-slate-400 hover:text-white hover:bg-slate-800"}`} title={group.label}>
                         <GroupIcon className="h-5 w-5 shrink-0" />
                      </button>
                    ) : (
                      <div className="space-y-1">
                        <button onClick={() => toggleGroup(group.id)} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold transition-colors rounded-xl ${groupActive && !isOpen ? "text-amber-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                          <span className="flex items-center gap-3 min-w-0">
                            <GroupIcon className="h-5 w-5 shrink-0" />
                            <span className="truncate">{group.label}</span>
                          </span>
                          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        
                        {isOpen && (
                          <div className="mt-1 space-y-1">
                            {visibleItems.map((item) => {
                              const hasExactMatch = visibleItems.some((i) => pathname === i.href);
                              const active = hasExactMatch ? pathname === item.href : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                              const isExternal = (item as any).external;

                              const itemContent = (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60 ml-2" />
                                  <span className="flex items-center gap-2 truncate">
                                    {item.label}
                                    {item.href === "/leaves/approvals" && user?.role === "Team Lead" && pendingApprovalsCount > 0 && (
                                      <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center shrink-0">{pendingApprovalsCount}</span>
                                    )}
                                  </span>
                                </>
                              );

                              if (isExternal) {
                                return (
                                  <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 pl-8 pr-3 py-2 text-sm transition-colors rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white`}>
                                    {itemContent}
                                  </a>
                                );
                              }

                              return (
                                <Link key={item.href} href={item.href} className={`flex items-center gap-3 pl-8 pr-3 py-2 text-sm transition-colors rounded-xl ${active ? "bg-amber-500/20 text-amber-400 font-semibold" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                                  {itemContent}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
          
          {/* User Profile Area (Desktop Bottom) */}
          {!isSidebarCollapsed && (
            <div className="p-4 border-t border-slate-800 shrink-0">
               <Link href="/profile" className="flex items-center gap-3 hover:bg-slate-800 p-2 rounded-xl transition-colors cursor-pointer">
                <RoyalAvatar
                  src={user?.profile_photo_path}
                  name={`${user?.first_name} ${user?.last_name}`}
                  userId={user?.id}
                  className="w-9 h-9 rounded-full bg-amber-400 text-sm font-bold text-white"
                />
                <div className="min-w-0 flex-1">
                  <RoyalName
                    name={`${user?.first_name} ${user?.last_name}`}
                    userId={user?.id}
                    className="text-sm font-semibold text-white truncate"
                  />
                  <p className="text-xs text-slate-400 truncate">{user?.role}</p>
                </div>
              </Link>
            </div>
          )}
        </aside>
      )}

      {/* Main Wrapper */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ease-in-out ${
        !isDark ? 'md:pl-[84px]' : isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
      }`}>
        <RecognitionTicker />
        
        {/* ── TOP HEADER (KEKA PURPLE #5a3794 FOR LIGHT THEME, SLATE-900 FOR DARK THEME) ── */}
        <header
          style={{
            backgroundColor: !isDark ? "#56348f" : undefined,
            fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
          className={`${
            !isDark ? "text-white shadow-md" : "bg-slate-900/80 backdrop-blur-md border-b border-white/10 text-slate-200"
          } sticky top-0 z-40 transition-colors`}
        >
          <div className="px-3 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-6">
            
            {/* Left: Mobile Hamburger + Logo + Brand Pill */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <button
                className="p-2 -ml-2 rounded-lg transition-colors shrink-0 md:hidden text-white/90 hover:text-white"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              
              <Link href="/dashboard" className="flex items-center shrink-0">
                <img
                  src="/logo.png"
                  alt="Inter Smart Logo"
                  className="h-8 sm:h-9 w-auto object-contain brightness-0 invert"
                />
              </Link>
            </div>

            {/* Center: Search Bar with In-Place Expandable Dropdown */}
            <div className="flex-1 max-w-lg mx-auto hidden sm:block relative">
              <button
                type="button"
                onClick={() => setSearchModalOpen((prev) => !prev)}
                className="w-full bg-white hover:bg-slate-50 transition-all rounded-full px-4 py-2 flex items-center justify-between text-xs text-slate-600 shadow-md border border-white/30 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Search className="w-4 h-4 text-purple-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-slate-400 font-normal truncate">
                    Search employees or actions (Ex: Apply Leave)
                  </span>
                </div>
                <kbd className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2.5 py-0.5 rounded-full border border-slate-200 shrink-0 ml-2 shadow-inner">
                  Alt + K
                </kbd>
              </button>

              {/* In-place Expandable Command Palette */}
              <CommandPalette open={searchModalOpen} onOpenChange={setSearchModalOpen} />
            </div>

            {/* Right: Actions & User Avatar */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto">
              {/* Mobile search trigger */}
              <button
                type="button"
                onClick={() => setSearchModalOpen(true)}
                className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 sm:hidden transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              <button
                onClick={() => setSearchModalOpen(true)}
                className="p-2 text-white hover:text-white rounded-full hover:bg-white/15 hidden md:flex transition-colors cursor-pointer"
                title="Quick Launch"
              >
                <Rocket className="w-5 h-5 text-white" />
              </button>

              <NotificationDropdown />

              <ThemeToggle />

              <Link
                href="/settings"
                className="p-2 text-white hover:text-white rounded-full hover:bg-white/15 hidden sm:flex transition-colors cursor-pointer"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-white" />
              </Link>

              <Link
                href="/profile"
                className="flex items-center gap-2 p-0.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer"
                title={`${user?.first_name} ${user?.last_name}`}
              >
                {user?.profile_photo_path ? (
                  <img
                    src={user.profile_photo_path}
                    alt={user.first_name}
                    className="w-8 h-8 rounded-full object-cover shadow-sm ring-1 ring-white/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#38bdf8] text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    {userInitials}
                  </div>
                )}
              </Link>

              <button
                onClick={handleLogout}
                style={{ color: "#ffffff" }}
                className="hidden lg:flex items-center gap-1.5 text-xs text-white hover:text-white bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-lg font-medium cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-white" />
                <span style={{ color: "#ffffff" }} className="font-semibold text-white">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Floating AI Chat Assistant */}
        <ChatbaseLottieButton />

        {/* Global Favorites Bar */}
        <FavoritesNav />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MOBILE DRAWER (HIGH CONTRAST BRIGHT TEXT FOR ALL DEVICES, ZERO OVERFLOW BUG)
      ───────────────────────────────────────────────────────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={closeMenu} />
          <div
            style={{
              backgroundColor: "#0e2638",
              fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            className="relative w-4/5 max-w-xs border-r border-[#1a3a52] flex flex-col h-full z-10 text-white shadow-2xl overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-[#1a3a52] bg-[#0c2233]">
              <img src="/logo.png" alt="Inter Smart Logo" className="h-8 object-contain brightness-0 invert" />
              <button onClick={closeMenu} className="p-1.5 rounded-lg text-[#8ea7bc] hover:text-white hover:bg-[#133249]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Navigation List with High-Contrast Text */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {STANDALONE.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className="flex items-center gap-3.5 px-3.5 py-2.5 text-sm font-semibold text-[#ffffff] bg-[#071724] rounded-xl border border-white/5 shadow-sm"
                >
                  <Icon className="h-5 w-5 text-amber-400" />
                  <span className="text-white font-medium">{label}</span>
                </Link>
              ))}

              {NAV_GROUPS.map((group) => {
                if (!groupHasVisibleItems(group, userRole)) return null;
                const visibleItems = group.items.filter((item) => isItemVisible(item, userRole));
                const GroupIcon = group.icon;

                return (
                  <div key={group.id} className="space-y-1.5 pt-2">
                    <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#8ea7bc] flex items-center gap-2">
                      <GroupIcon className="w-3.5 h-3.5 text-purple-400" />
                      <span>{group.label}</span>
                    </div>
                    <div className="space-y-1 pl-2 border-l border-[#1a3a52] ml-2">
                      {visibleItems.map((item) => {
                        const hasExactMatch = visibleItems.some((i) => pathname === i.href);
                        const active = hasExactMatch
                          ? pathname === item.href
                          : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeMenu}
                            className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                              active
                                ? "bg-[#071724] text-white font-bold border-l-2 border-amber-400"
                                : "text-[#cbd5e1] hover:text-white hover:bg-[#133249]"
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-[#8ea7bc]" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer Bottom User & Logout */}
            <div className="p-4 border-t border-[#1a3a52] bg-[#0c2233] space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#38bdf8] text-white text-xs font-bold flex items-center justify-center">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white truncate">{user?.first_name} {user?.last_name}</div>
                  <div className="text-xs text-[#8ea7bc] truncate">{user?.role}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 rounded-xl transition-colors border border-rose-500/30"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
