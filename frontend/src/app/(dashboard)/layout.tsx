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
  FolderKanban, CheckSquare, Clock, Building2, HeartHandshake, HelpCircle
} from "lucide-react";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { RecognitionTicker } from "@/components/layout/RecognitionTicker";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { FavoritesNav } from "@/components/layout/FavoritesNav";
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
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [activeFlyoutGroup, setActiveFlyoutGroup] = useState<string | null>(null);
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
      if (!target.closest('#light-theme-sidebar') && !target.closest('#light-theme-flyout')) {
        setActiveFlyoutGroup(null);
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

  const handleLightGroupMouseEnter = (groupId: string) => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
    setHoveredGroupId(groupId);
    setActiveFlyoutGroup(groupId);
  };

  const handleLightGroupMouseLeave = () => {
    flyoutTimeoutRef.current = setTimeout(() => {
      setHoveredGroupId(null);
      setActiveFlyoutGroup(null);
    }, 250);
  };

  const handleLightFlyoutMouseEnter = () => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
  };

  const handleLightFlyoutMouseLeave = () => {
    flyoutTimeoutRef.current = setTimeout(() => {
      setHoveredGroupId(null);
      setActiveFlyoutGroup(null);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background flex">
      {/* ─────────────────────────────────────────────────────────────────────────────
          SIDEBAR - LIGHT THEME (KEKA STYLE: FIXED 82px, ICON ON TOP, LABEL UNDERNEATH,
          DROPDOWN FLYOUT SUBMENU, SAME COLOR #0e2638, SAME 11px 500 FONT, NO EXPAND)
      ───────────────────────────────────────────────────────────────────────────── */}
      {!isDark && (
        <aside
          id="light-theme-sidebar"
          style={{
            backgroundColor: "#0e2638",
            fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
          className="hidden md:flex flex-col fixed inset-y-0 left-0 z-50 w-[82px] border-r border-[#1a3a52] select-none text-white"
        >
          {/* Logo Brand Header */}
          <div className="h-16 flex flex-col items-center justify-center border-b border-[#1a3a52] shrink-0 bg-[#0c2233]">
            <Link href="/dashboard" className="flex items-center justify-center p-1.5">
              <img src="/logo.png" alt="Logo" className="h-7 w-auto object-contain brightness-0 invert" />
            </Link>
          </div>

          {/* Navigation Items (Icon on top, Label underneath) */}
          <div className="flex-1 overflow-y-auto overflow-x-visible py-2 custom-scrollbar">
            <nav className="space-y-1 px-1.5">
              {/* Standalone Link (Home / Dashboard) */}
              {STANDALONE.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setActiveFlyoutGroup(null)}
                    style={{
                      backgroundColor: active ? "#071520" : undefined,
                      color: active ? "#ffffff" : "rgba(255, 255, 255, 0.72)",
                    }}
                    className={`group w-full flex flex-col items-center justify-center py-2.5 px-1 rounded-lg transition-colors relative cursor-pointer hover:bg-[#133249] hover:text-white ${
                      active ? "font-semibold shadow-inner" : ""
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1 shrink-0 ${active ? "text-white" : "text-white/70 group-hover:text-white"}`} />
                    <span className="text-[11px] leading-[14px] font-[500] text-center truncate max-w-full px-0.5">
                      {label}
                    </span>
                  </Link>
                );
              })}

              {/* Nav Groups with Dropdown Flyouts */}
              {NAV_GROUPS.map((group) => {
                if (!groupHasVisibleItems(group, userRole)) return null;
                const visibleItems = group.items.filter((item) => isItemVisible(item, userRole));
                const groupActive = pathBelongsToGroup(group, pathname);
                const isFlyoutOpen = activeFlyoutGroup === group.id;
                const GroupIcon = group.icon;

                const hasBadge = group.id === "leave-wfh" && user?.role === "Team Lead" && pendingApprovalsCount > 0;

                return (
                  <div
                    key={group.id}
                    className="relative"
                    onMouseEnter={() => handleLightGroupMouseEnter(group.id)}
                    onMouseLeave={handleLightGroupMouseLeave}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFlyoutGroup(isFlyoutOpen ? null : group.id)}
                      style={{
                        backgroundColor: groupActive || isFlyoutOpen ? "#071520" : undefined,
                        color: groupActive || isFlyoutOpen ? "#ffffff" : "rgba(255, 255, 255, 0.72)",
                      }}
                      className={`group w-full flex flex-col items-center justify-center py-2.5 px-1 rounded-lg transition-colors relative cursor-pointer hover:bg-[#133249] hover:text-white ${
                        groupActive ? "font-semibold shadow-inner" : ""
                      }`}
                    >
                      {/* Red notification badge on icon top-right */}
                      {hasBadge && (
                        <span className="absolute top-1 right-2 bg-[#ff5252] text-white text-[10px] font-bold rounded-full px-1.5 py-0.2 min-w-[18px] text-center shadow-md animate-pulse">
                          {pendingApprovalsCount}
                        </span>
                      )}

                      <GroupIcon className={`w-5 h-5 mb-1 shrink-0 ${groupActive || isFlyoutOpen ? "text-white" : "text-white/70 group-hover:text-white"}`} />
                      <span className="text-[11px] leading-[14px] font-[500] text-center truncate max-w-full px-0.5">
                        {group.shortLabel || group.label}
                      </span>
                    </button>

                    {/* Dropdown Flyout Submenu */}
                    {isFlyoutOpen && (
                      <div
                        id="light-theme-flyout"
                        onMouseEnter={handleLightFlyoutMouseEnter}
                        onMouseLeave={handleLightFlyoutMouseLeave}
                        style={{
                          backgroundColor: "#0e2638",
                          borderColor: "#1a3a52",
                          fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                        className="absolute left-[78px] top-0 w-60 rounded-r-xl rounded-bl-xl shadow-2xl border border-[#1a3a52] overflow-hidden z-[100] py-1.5 animate-in fade-in zoom-in-95 duration-150"
                      >
                        {/* Submenu Title */}
                        <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1a3a52] flex items-center justify-between">
                          <span>{group.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal">Menu</span>
                        </div>

                        {/* Submenu Links */}
                        <div className="py-1 max-h-[70vh] overflow-y-auto custom-scrollbar">
                          {visibleItems.map((item) => {
                            const hasExactMatch = visibleItems.some((i) => pathname === i.href);
                            const active = hasExactMatch
                              ? pathname === item.href
                              : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                            const isExternal = (item as any).external;

                            const itemContent = (
                              <div className="flex items-center justify-between w-full">
                                <span className="truncate">{item.label}</span>
                                {item.href === "/leaves/approvals" && user?.role === "Team Lead" && pendingApprovalsCount > 0 && (
                                  <span className="bg-[#ff5252] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center ml-2">
                                    {pendingApprovalsCount}
                                  </span>
                                )}
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                              </div>
                            );

                            if (isExternal) {
                              return (
                                <a
                                  key={item.href}
                                  href={item.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group flex items-center px-4 py-2.5 text-[12px] font-[500] text-white/80 hover:text-white hover:bg-[#163b56] transition-colors"
                                >
                                  {itemContent}
                                </a>
                              );
                            }

                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setActiveFlyoutGroup(null)}
                                style={{
                                  backgroundColor: active ? "#071520" : undefined,
                                  color: active ? "#ffffff" : undefined,
                                }}
                                className={`group flex items-center px-4 py-2.5 text-[12px] font-[500] transition-colors ${
                                  active
                                    ? "text-white font-bold bg-[#071520] border-l-2 border-amber-400"
                                    : "text-white/80 hover:text-white hover:bg-[#163b56]"
                                }`}
                              >
                                {itemContent}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* User Profile Mini Badge (Bottom) */}
          <div className="p-2 border-t border-[#1a3a52] shrink-0 bg-[#0c2233] flex flex-col items-center justify-center">
            <Link
              href="/profile"
              className="flex flex-col items-center justify-center p-1 rounded-lg hover:bg-[#133249] transition-colors group cursor-pointer"
              title={`${user?.first_name} ${user?.last_name} (${user?.role})`}
            >
              <RoyalAvatar
                src={user?.profile_photo_path}
                name={`${user?.first_name} ${user?.last_name}`}
                userId={user?.id}
                className="w-8 h-8 rounded-full bg-amber-400 text-xs font-bold text-white mb-0.5"
              />
              <span className="text-[10px] text-white/80 font-medium truncate max-w-[70px] text-center">
                {user?.first_name}
              </span>
            </Link>
          </div>
        </aside>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          SIDEBAR - DARK THEME (100% UNTOUCHED ORIGINAL WITH COLLAPSE / EXPAND DRAWER)
      ───────────────────────────────────────────────────────────────────────────── */}
      {isDark && (
        <aside className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-50 bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <div className={`h-16 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-4'} border-b border-slate-800 shrink-0 relative`}>
            {!isSidebarCollapsed && (
              <Link href="/dashboard" className="flex items-center min-w-0 pr-2">
                <img src="/logo.png" alt="Inter Smart Logo" className="h-10 sm:h-12 w-auto object-contain shrink-0 max-w-[150px]" />
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
        !isDark ? 'md:pl-[82px]' : isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
      }`}>
        <RecognitionTicker />
        
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 shadow-sm sticky top-0 z-40">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            
            {/* Mobile Left: Hamburger + Logo */}
            <div className="flex items-center gap-3 md:hidden">
              <button
                className="p-2 -ml-2 rounded-lg transition-colors shrink-0 hover:!bg-transparent active:!bg-transparent"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="h-6 w-6 text-slate-600 dark:text-slate-300" /> : <Menu className="h-6 w-6 text-slate-600 dark:text-slate-300" />}
              </button>
              <Link href="/dashboard" className="flex items-center shrink min-w-0">
                <img src="/logo.png" alt="Inter Smart Logo" className="h-8 object-contain" />
              </Link>
            </div>

            {/* Desktop Left: Logo when sidebar is collapsed in dark mode or fixed in light mode */}
            <div className="hidden md:flex flex-1 items-center">
              {((isDark && isSidebarCollapsed) || !isDark) && (
                <Link href="/dashboard" className="flex items-center shrink min-w-0">
                  <img src="/logo.png" alt="Inter Smart Logo" className="h-8 object-contain" />
                </Link>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-auto">
              <ThemeToggle />
              <NotificationDropdown />

              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors px-3 py-2 rounded-lg hover:bg-rose-500/10 font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
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

      {/* Mobile Drawer (both modes) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMenu} />
          <div className="relative w-4/5 max-w-xs bg-slate-900 border-r border-slate-800 flex flex-col h-full z-10">
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
              <img src="/logo.png" alt="Inter Smart Logo" className="h-8 object-contain" />
              <button onClick={closeMenu} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
              {STANDALONE.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 rounded-xl"
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </Link>
              ))}

              {NAV_GROUPS.map((group) => {
                if (!groupHasVisibleItems(group, userRole)) return null;
                const visibleItems = group.items.filter((item) => isItemVisible(item, userRole));
                const GroupIcon = group.icon;

                return (
                  <div key={group.id} className="space-y-1">
                    <div className="px-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      {group.label}
                    </div>
                    {visibleItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
                      >
                        <GroupIcon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl"
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
