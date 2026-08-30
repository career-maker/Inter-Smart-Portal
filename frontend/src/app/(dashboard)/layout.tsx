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
  Search, Rocket, Bell, Settings, Puzzle, Laptop
} from "lucide-react";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { RecognitionTicker } from "@/components/layout/RecognitionTicker";
import { BookmarksDropdown } from "@/components/layout/BookmarksDropdown";
import { CommandPalette } from "@/components/CommandPalette";
import api from "@/services/api";
import teamPermissionsApi from "@/services/teamPermissions";
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
    id: "leaves",
    label: "Leaves",
    shortLabel: "Leaves",
    icon: CalendarCheck,
    items: [
      { href: "/leaves",           label: "All Leaves", roles: ["Super Admin"] },
      { href: "/leaves",           label: "My Leaves", roles: ["Employee", "Team Lead", "HR"] },
      { href: "/leaves/apply",     label: "Apply Leave", roles: ["Employee", "Team Lead"] },
      { href: "/calendar",         label: "Leave Calendar" },
      { href: "/holidays",         label: "Holidays", roles: ["Super Admin", "HR"] },
      { href: "/leaves/approvals", label: "Leave Approvals", roles: ["Super Admin", "Team Lead"] },
      { href: "/leave-balances",   label: "Leave Balances", roles: ["Super Admin"] },
      { href: "/project-management/addons/leave-policy", label: "Leave Policy Management", roles: ["Super Admin"] },
      { href: "/manage-leaves",    label: "Manage Approved Leaves", roles: ["Super Admin"] },
    ],
  },
  {
    id: "wfh",
    label: "Work From Home",
    shortLabel: "WFH",
    icon: Laptop,
    items: [
      { href: "/wfh",                     label: "WFH Requests" },
      { href: "/leaves/approvals?tab=wfh", label: "WFH Approvals", roles: ["Super Admin", "Team Lead"] },
    ],
  },
  {
    id: "project-management",
    label: "Project Management",
    shortLabel: "Projects",
    icon: FolderKanban,
    items: [
      { href: "/project-management",          label: "Overview" },
      { href: "/project-management/status",    label: "Project Status", roles: ["Super Admin", "Team Lead"] },
      { href: "/project-management/projects",  label: "Projects" },
      { href: "/project-management/tasks",     label: "All Tasks", roles: ["Super Admin", "Team Lead"] },
      { href: "/project-management/tasks/my",  label: "My Tasks" },
      { href: "/project-management/tasks/overdue", label: "Overdue Tasks" },
      { href: "/project-management/tasks/completed", label: "Completed Tasks" },
      { href: "/project-management/tasks/forecast", label: "Forecast Tasks" },
      { href: "/project-management/bug-reports", label: "Bug Reports" },
      { href: "/project-management/hubstaff",       label: "Hubstaff", roles: ["Super Admin", "Team Lead"] },
      { href: "/project-management/task-catalog", label: "Task Catalog", roles: ["Super Admin", "HR"] },
    ],
  },
  {
    id: "addons",
    label: "Add-ons",
    shortLabel: "Add-ons",
    icon: Puzzle,
    roles: ["Super Admin"],
    items: [
      { href: "/project-management/addons", label: "All Add-ons Directory" },
      { href: "/project-management/addons/email-management", label: "Email & SMTP Management" },
      { href: "/project-management/addons/leave-policy", label: "Leave Policy Management" },
      { href: "/project-management/addons/permissions", label: "Team & Role Permissions" },
      { href: "/project-management/bug-reports", label: "Bug Tracker & Reports" },
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

function isItemVisible(item: NavItem, role: string, permissions: Record<string, boolean> = {}) {
  if (item.href === "/project-management/tasks" && permissions.task_cross_team_view) {
    return true;
  }
  if (item.href === "/project-management/bug-reports" && permissions.bug_reports_cross_team) {
    return true;
  }
  if (item.href === "/project-management/hubstaff" && permissions.hubstaff_team_view) {
    return true;
  }
  if (item.href === "/attendance/management" && permissions.attendance_team_view) {
    return true;
  }
  if (item.roles && !item.roles.includes(role)) return false;
  return true;
}

function groupHasVisibleItems(group: NavGroup, role: string, permissions: Record<string, boolean> = {}) {
  if (group.roles && !group.roles.includes(role)) return false;
  return group.items.some((item) => isItemVisible(item, role, permissions));
}

function pathBelongsToGroup(group: NavGroup, pathname: string, currentTab?: string | null) {
  if (group.id === "wfh") {
    if (pathname === "/wfh" || pathname.startsWith("/wfh/")) return true;
    if (pathname === "/leaves/approvals" && currentTab === "wfh") return true;
    return false;
  }
  if (group.id === "leaves") {
    if (pathname === "/leaves/approvals" && currentTab === "wfh") return false;
    return group.items.some((item) => {
      const clean = item.href.split("?")[0];
      return pathname === clean || pathname.startsWith(clean + "/");
    });
  }
  return group.items.some((item) => {
    const clean = item.href.split("?")[0];
    return pathname === clean || pathname.startsWith(clean + "/");
  });
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout, updateUser } = useAuthStore();
  const isDark = useThemeStore((state) => state.isDark);
  const router = useRouter();
  const pathname = usePathname();
  const [currentTab, setCurrentTab] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentTab(new URLSearchParams(window.location.search).get("tab"));
    }
  }, [pathname]);

  const [isHydrated, setIsHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  
  // Search Modal & Flyout State
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [flyoutState, setFlyoutState] = useState<{ groupId: string; top: number } | null>(null);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const [pendingWfhCount, setPendingWfhCount] = useState(0);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const flyoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      teamPermissionsApi.getMyPermissions()
        .then((res) => {
          setUserPermissions(res.permissions || {});
        })
        .catch((err) => console.warn("Failed to fetch user permissions in layout", err));
    }
  }, [isAuthenticated]);

  // Fetch pending approvals for Team Leads & Super Admins
  useEffect(() => {
    if (user?.role === "Team Lead" || user?.role === "Super Admin") {
      const fetchPendingCount = async () => {
        try {
          const [leavesRes, wfhRes] = await Promise.allSettled([
            api.get("/leave-requests?status=Pending"),
            api.get("/wfh-requests?status=Pending"),
          ]);
          if (leavesRes.status === "fulfilled") {
            setPendingLeavesCount(leavesRes.value.data?.data?.data?.length ?? 0);
          }
          if (wfhRes.status === "fulfilled") {
            setPendingWfhCount(wfhRes.value.data?.data?.data?.length ?? 0);
          }
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
      <div className="fixed inset-0 bg-white flex flex-col overflow-hidden z-[9999]">
        <div className="h-16 bg-white border-b border-slate-200" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center">
            <div className="bg-white p-5 rounded-3xl flex flex-col items-center justify-center gap-3">
              <img
                src="/preloader.gif"
                alt="Loading..."
                className="w-12 h-12 object-contain"
              />
            </div>
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
    const windowH = typeof window !== "undefined" ? window.innerHeight : 800;
    const groupObj = NAV_GROUPS.find((g) => g.id === groupId);
    const visibleCount = groupObj ? groupObj.items.filter((i) => isItemVisible(i, userRole, userPermissions)).length : 8;
    const estHeight = 40 + (visibleCount * 36) + 16;
    const maxTop = Math.max(10, windowH - estHeight - 20);
    const safeTop = Math.max(10, Math.min(rect.top, maxTop));
    setFlyoutState({ groupId, top: safeTop });
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
  const activeFlyoutVisibleItems = activeFlyoutGroupObj ? activeFlyoutGroupObj.items.filter((i) => isItemVisible(i, userRole, userPermissions)) : [];


  // Role-based Sub-Header Tabs (Keka exact style)
  const getSubTabs = () => {
    const userRoleStr = (userRole || "").toLowerCase();
    const isTeamLead = userRole === "Team Lead" || userRoleStr.includes("lead") || Boolean((user as any)?.is_lead);
    const isSuperAdmin = userRole === "Super Admin" || userRoleStr === "admin";
    const canViewAllTasks = isSuperAdmin || isTeamLead || Boolean(userPermissions.task_cross_team_view);

    if (isSuperAdmin || userRole === "HR") {
      return [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Employee Management", href: "/employees" },
        { label: "Community", href: "/community", badge: "New" },
        { label: "Attendance Management", href: "/attendance/management" },
        { label: "Hubstaff", href: "/project-management/hubstaff" },
      ];
    }
    if (isTeamLead) {
      return [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Community", href: "/community", badge: "New" },
        { label: "Tasks", href: "/project-management/tasks" },
        { label: "Hubstaff", href: "/project-management/hubstaff" },
      ];
    }
    // Default for Employees
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Community", href: "/community", badge: "New" },
      { label: "Tasks", href: canViewAllTasks ? "/project-management/tasks" : "/project-management/tasks/my" },
      ...(userPermissions.hubstaff_team_view ? [{ label: "Hubstaff", href: "/project-management/hubstaff" }] : []),
    ];
  };

  const subTabs = getSubTabs();

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
              fontFamily: '"Proxima Nova", sans-serif'
            }}
            className="hidden md:flex flex-col fixed inset-y-0 left-0 z-50 w-[84px] border-r border-[#1a3a52] select-none shadow-xl overflow-hidden"
          >
            <style>{`
              #light-theme-sidebar, #light-theme-sidebar * {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
              }
              #light-theme-sidebar ::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
              }
            `}</style>
            {/* Top header area above side menu with looping animation GIF (Clean #091A2A background) */}
            <div
              style={{ backgroundColor: "#091A2A" }}
              className="h-16 shrink-0 border-b border-[#1a3a52] flex items-center justify-center p-2 select-none"
            >
              <img
                src="/preloader.gif"
                alt="Animation"
                className="h-10 w-10 object-contain"
              />
            </div>

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
                  if (!groupHasVisibleItems(group, userRole, userPermissions)) return null;
                  const groupActive = pathBelongsToGroup(group, pathname, currentTab);
                  const isFlyoutOpen = flyoutState?.groupId === group.id;
                  const isHighlighted = groupActive || isFlyoutOpen;
                  const GroupIcon = group.icon;
                  const groupBadgeCount =
                    group.id === "leaves" && (user?.role === "Team Lead" || user?.role === "Super Admin")
                      ? pendingLeavesCount
                      : group.id === "wfh" && (user?.role === "Team Lead" || user?.role === "Super Admin")
                      ? pendingWfhCount
                      : 0;

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
                        {groupBadgeCount > 0 && (
                          <span className="absolute top-1.5 right-2 bg-[#ff5252] text-white text-[10px] font-bold rounded-full px-1.5 py-0.2 min-w-[18px] text-center shadow-md animate-pulse">
                            {groupBadgeCount}
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

            {/* User Profile Mini Badge (Bottom - With Top Awardee Golden Honor Ring & Crown) */}
            <div className="pt-2.5 pb-2 border-t border-[#1a3a52] shrink-0 bg-[#0c2233] flex flex-col items-center justify-center">
              <Link
                href="/profile"
                className="flex flex-col items-center justify-center px-1 py-0.5 rounded-none hover:bg-[#133249] transition-colors group cursor-pointer w-full"
                title={`${user?.first_name} ${user?.last_name} (${user?.role})`}
              >
                <div className="my-1.5 flex items-center justify-center">
                  <RoyalAvatar
                    src={user?.profile_photo_path}
                    name={`${user?.first_name} ${user?.last_name}`}
                    userId={user?.id}
                    className="w-8 h-8 rounded-full"
                  />
                </div>
                <span style={{ color: "#8ea7bc" }} className="text-[11px] font-medium truncate max-w-[74px] text-center group-hover:!text-white mt-0.5">
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
                fontFamily: '"Proxima Nova", sans-serif',
                maxHeight: "calc(100vh - 20px)",
              }}
              className="fixed left-[84px] w-64 rounded-r-xl rounded-bl-xl shadow-2xl border border-[#1a3a52] z-[999] py-1.5 animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden"
            >
              {/* Submenu Title */}
              <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#8ea7bc] border-b border-[#1a3a52] flex items-center justify-between bg-[#0a1d2c]/90 shrink-0">
                <span style={{ color: "#ffffff" }} className="font-bold">{activeFlyoutGroupObj.label}</span>
                <span style={{ color: "#8ea7bc" }} className="text-[10px] font-normal">Menu</span>
              </div>

              {/* Submenu Links - Hidden scrollbar but seamlessly scrollable */}
              <div
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
                className="py-1 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
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
                      {item.href === "/leaves/approvals" && (user?.role === "Team Lead" || user?.role === "Super Admin") && pendingLeavesCount > 0 && (
                        <span className="bg-[#ff5252] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center ml-2">
                          {pendingLeavesCount}
                        </span>
                      )}
                      {item.href === "/leaves/approvals?tab=wfh" && (user?.role === "Team Lead" || user?.role === "Super Admin") && pendingWfhCount > 0 && (
                        <span className="bg-[#ff5252] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center ml-2">
                          {pendingWfhCount}
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
                if (!groupHasVisibleItems(group, userRole, userPermissions)) return null;
                const visibleItems = group.items.filter((item) => isItemVisible(item, userRole, userPermissions));
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
                                    {item.href === "/leaves/approvals" && (user?.role === "Team Lead" || user?.role === "Super Admin") && pendingLeavesCount > 0 && (
                                      <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center shrink-0">{pendingLeavesCount}</span>
                                    )}
                                    {item.href === "/leaves/approvals?tab=wfh" && (user?.role === "Team Lead" || user?.role === "Super Admin") && pendingWfhCount > 0 && (
                                      <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center shrink-0">{pendingWfhCount}</span>
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
        
        {/* ── FIXED TOP HEADER & SUB-TABS BAR (ALWAYS PINNED AT TOP ON SCROLL) ── */}
        <div
          id="global-fixed-header-container"
          className={`fixed top-0 right-0 z-40 transition-all duration-300 ease-in-out shadow-md ${
            !isDark ? 'left-0 md:left-[84px]' : isSidebarCollapsed ? 'left-0 md:left-20' : 'left-0 md:left-64'
          }`}
        >
          {/* ── TOP HEADER (KEKA PURPLE #56348f FOR LIGHT THEME, SLATE-900 FOR DARK THEME) ── */}
          <header
            style={{
              backgroundColor: !isDark ? "#56348f" : undefined,
              fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            className={`${
              !isDark ? "text-white" : "bg-slate-900/90 backdrop-blur-md border-b border-white/10 text-slate-200"
            } transition-colors w-full`}
          >
            <div className="px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-6">
              
              {/* Left: Mobile Hamburger + Logo */}
              <div className="flex items-center gap-1.5 sm:gap-4 shrink-0 min-w-0">
                <button
                  style={{ backgroundColor: "transparent", border: "none", outline: "none", boxShadow: "none" }}
                  className="p-1.5 -ml-1 text-white bg-transparent hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus:outline-none shrink-0 md:hidden cursor-pointer"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Toggle menu"
                >
                  {menuOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
                </button>
                
                <Link href="/dashboard" className="flex items-center shrink-0 min-w-0">
                  <img
                    src="/logo.png"
                    alt="Inter Smart Logo"
                    className="h-6 sm:h-9 w-auto max-w-[130px] sm:max-w-none object-contain object-left brightness-0 invert"
                  />
                </Link>
              </div>

              {/* Center: Search Bar (Desktop only) */}
              <div className="hidden sm:flex flex-1 max-w-lg mx-auto relative">
                <button
                  type="button"
                  onClick={() => setSearchModalOpen(true)}
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
              </div>

              {/* Right: Actions & User Avatar */}
              <div className="flex items-center gap-1 sm:gap-3 shrink-0 ml-auto">
                {/* Mobile search trigger */}
                <button
                  type="button"
                  onClick={() => setSearchModalOpen(true)}
                  className="p-1.5 text-white/90 hover:text-white rounded-full hover:bg-white/10 sm:hidden transition-colors cursor-pointer shrink-0"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setSearchModalOpen(true)}
                  className="p-2 text-white hover:text-white rounded-full hover:bg-white/15 hidden md:flex transition-colors cursor-pointer shrink-0"
                  title="Quick Launch"
                >
                  <Rocket className="w-5 h-5 text-white" />
                </button>

                <BookmarksDropdown />

                <NotificationDropdown />

                <Link
                  href="/profile"
                  className="flex items-center p-0.5 sm:p-1 rounded-full hover:bg-white/15 transition-colors cursor-pointer shrink-0"
                  title={`${user?.first_name} ${user?.last_name}`}
                >
                  <RoyalAvatar
                    src={user?.profile_photo_path}
                    name={`${user?.first_name} ${user?.last_name}`}
                    userId={user?.id}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
                  />
                </Link>

                <button
                  onClick={handleLogout}
                  style={{ color: "#ffffff" }}
                  className="hidden lg:flex items-center gap-1.5 text-xs text-white hover:text-white bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-lg font-medium cursor-pointer shrink-0"
                >
                  <LogOut className="h-4 w-4 text-white" />
                  <span style={{ color: "#ffffff" }} className="font-semibold text-white">Logout</span>
                </button>
              </div>
            </div>

            {/* Global Command Palette */}
            <CommandPalette open={searchModalOpen} onOpenChange={setSearchModalOpen} />
          </header>

          {/* ── KEKA SUB-HEADER TAB NAVIGATION BAR (STICKY WITH HEADER - ZERO SCROLLBAR, FULL HEIGHT) ── */}
          <div
            id="sub-header-tabs-bar"
            style={{
              fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden w-full"
          >
            <style>{`
              #sub-header-tabs-bar, #sub-header-tabs-bar * {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
              }
              #sub-header-tabs-bar ::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
              }
            `}</style>
            <div className="px-4 sm:px-8 flex items-center gap-6 sm:gap-8 h-10 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {subTabs.map((tab) => {
                const active = tab.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === tab.href || pathname.startsWith(tab.href + "/");

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    style={{
                      fontFamily: '"Proxima Nova", sans-serif',
                      fontSize: "11px",
                      lineHeight: "16px",
                      fontWeight: active ? 600 : 500,
                      color: active ? "#56348f" : "rgb(15, 24, 36)",
                    }}
                    className="relative h-full flex items-center uppercase tracking-wider transition-colors shrink-0 gap-1.5 cursor-pointer hover:!text-[#56348f] focus:outline-none focus:ring-0"
                  >
                    <span className="py-2">{tab.label}</span>
                    {tab.badge && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse inline-block" />
                    )}
                    {active && (
                      <span className="absolute bottom-0 inset-x-0 h-[2px] bg-[#56348f] dark:bg-purple-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Precise Spacer for Fixed 104px Header (64px Purple Bar + 40px SubTabs) */}
        <div className="h-[104px] shrink-0 w-full" />

        {/* Floating AI Chat Assistant */}
        <ChatbaseLottieButton />

        {/* Page Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-1 sm:pt-1.5 pb-6 sm:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MOBILE DRAWER (HIGH CONTRAST BRIGHT TEXT FOR ALL DEVICES, ZERO OVERFLOW BUG)
      ───────────────────────────────────────────────────────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <style>{`
            #mobile-nav-drawer, #mobile-nav-drawer * {
              box-sizing: border-box;
            }
            #mobile-nav-drawer ::-webkit-scrollbar {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
            }
            #mobile-nav-drawer a {
              color: #ffffff !important;
              text-decoration: none !important;
            }
            #mobile-nav-drawer .drawer-category-title {
              color: #8ea7bc !important;
            }
            #mobile-nav-drawer .drawer-subitem {
              color: #f1f5f9 !important;
            }
            #mobile-nav-drawer .drawer-subitem:hover {
              color: #ffffff !important;
              background-color: #133249 !important;
            }
            #mobile-nav-drawer .drawer-subitem-active {
              color: #ffffff !important;
              background-color: #071724 !important;
            }
          `}</style>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={closeMenu} />
          <div
            id="mobile-nav-drawer"
            style={{
              backgroundColor: "#0e2638",
              fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            className="relative w-4/5 max-w-xs border-r border-[#1a3a52] flex flex-col h-full z-10 text-white shadow-2xl overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-[#1a3a52] bg-[#0c2233] shrink-0">
              <img src="/logo.png" alt="Inter Smart Logo" className="h-8 object-contain brightness-0 invert" />
              <button
                onClick={closeMenu}
                style={{ backgroundColor: "transparent", border: "none" }}
                className="p-1.5 rounded-lg text-[#8ea7bc] hover:text-white hover:bg-[#133249] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Navigation List with High-Contrast Text */}
            <div
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {STANDALONE.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  style={{ backgroundColor: "#071724", color: "#ffffff" }}
                  className="flex items-center gap-3.5 px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-white/10 shadow-sm cursor-pointer hover:bg-[#133249]"
                >
                  <Icon className="h-5 w-5 text-amber-400 shrink-0" />
                  <span style={{ color: "#ffffff" }} className="font-semibold text-white">{label}</span>
                </Link>
              ))}

              {NAV_GROUPS.map((group) => {
                if (!groupHasVisibleItems(group, userRole)) return null;
                const visibleItems = group.items.filter((item) => isItemVisible(item, userRole));
                const GroupIcon = group.icon;

                return (
                  <div key={group.id} className="space-y-1.5 pt-2">
                    <div className="px-3 text-[11.5px] font-bold uppercase tracking-wider flex items-center gap-2">
                      <GroupIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="drawer-category-title font-bold">{group.label}</span>
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
                            className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                              active ? "drawer-subitem-active font-bold border-l-2 border-amber-400" : "drawer-subitem font-normal"
                            }`}
                          >
                            <span style={{ color: active ? "#ffffff" : "#f1f5f9" }} className="truncate font-medium">
                              {item.label}
                            </span>
                            <ChevronRight style={{ color: "#8ea7bc" }} className="w-3.5 h-3.5 shrink-0 ml-1" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer Bottom User & Logout */}
            <div className="p-4 border-t border-[#1a3a52] bg-[#0c2233] space-y-3 shrink-0">
              <div className="flex items-center gap-3">
                <RoyalAvatar
                  src={user?.profile_photo_path}
                  name={`${user?.first_name} ${user?.last_name}`}
                  userId={user?.id}
                  className="w-9 h-9 rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <div style={{ color: "#ffffff" }} className="text-sm font-bold text-white truncate">
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div style={{ color: "#8ea7bc" }} className="text-xs text-[#8ea7bc] truncate">
                    {user?.role}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{ color: "#ffffff", backgroundColor: "#dc2626" }}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md cursor-pointer border border-red-500"
              >
                <LogOut className="h-4 w-4 text-white" />
                <span style={{ color: "#ffffff" }} className="text-white font-bold">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
