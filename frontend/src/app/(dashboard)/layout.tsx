"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import {
  LogOut, Menu, X, ChevronRight, Home, ChevronDown,
  LayoutDashboard, CalendarCheck, Briefcase, UserCircle,
  Users, ShieldCheck, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { RecognitionTicker } from "@/components/layout/RecognitionTicker";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { FavoritesNav } from "@/components/layout/FavoritesNav";
import api from "@/services/api";
import Script from "next/script";
import ChatbaseLottieButton from "@/components/ChatbaseLottieButton";

type NavItem = {
  href: string;
  label: string;
  roles?: string[];
  external?: boolean;
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

// Team Lead: Approvals count badge helper
const getApprovalsCount = async () => {
  try {
    const res = await api.get("/leave-requests?status=Pending");
    return res.data.data?.data?.length ?? 0;
  } catch (e) {
    return 0;
  }
};

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
      { href: "/holidays",         label: "Holidays", roles: ["Super Admin", "HR"] },
      { href: "/leaves/approvals", label: "Leave Approvals", roles: ["Super Admin", "Team Lead"] },
      { href: "/leave-balances",   label: "Leave Balances", roles: ["Super Admin"] },
      { href: "/manage-leaves",    label: "Manage Approved Leaves/WFH", roles: ["Super Admin"] },
    ],
  },
  {
    id: "ta",
    label: "Travel Allowance",
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
    icon: Briefcase,
    items: [
      { href: "/announcements", label: "Updates & Announcements" },
      { href: "/documents",     label: "Request Documents" },
      { href: "/policies",      label: "HR Policies" },
    ],
  },
  {
    id: "my-account",
    label: "My Account",
    icon: UserCircle,
    items: [
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
    id: "admin",
    label: "Administration",
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
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

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
      const interval = setInterval(fetchPendingCount, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user?.role]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking the hamburger button
      if (target.closest('button[aria-label="Toggle menu"]')) return;
      // Don't close if clicking inside the menu
      if (target.closest('[role="navigation"]') || target.closest('.fixed.inset-0')) return;

      setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

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

  // Refresh user profile once on initial authenticated load only (not on every route change)
  const [meFetched, setMeFetched] = useState(false);
  useEffect(() => {
    if (!isHydrated || !isAuthenticated || meFetched) return;
    setMeFetched(true);
    api.get("/me").then((res) => {
      if (res.data?.user) updateUser(res.data.user);
    }).catch(() => {});
  }, [isHydrated, isAuthenticated]);

  // Show a minimal skeleton shell during hydration instead of a blank black screen
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background flex">
      {/* Desktop Sidebar */}
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
                    // Collapsed state: just show the icon and expand when clicked
                    <button onClick={() => { setIsSidebarCollapsed(false); setOpenGroup(group.id); }} className={`w-full flex items-center justify-center p-2.5 text-sm font-semibold transition-colors rounded-xl ${groupActive ? "text-amber-400 bg-amber-500/10" : "text-slate-400 hover:text-white hover:bg-slate-800"}`} title={group.label}>
                       <GroupIcon className="h-5 w-5 shrink-0" />
                    </button>
                  ) : (
                    // Expanded state
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
              <div className="w-9 h-9 rounded-full bg-amber-400 overflow-hidden flex items-center justify-center text-sm font-bold text-white relative shrink-0">
                <span>{user?.first_name?.[0]}{user?.last_name?.[0]}</span>
                {user?.profile_photo_path && <img src={user.profile_photo_path} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.role}</p>
              </div>
            </Link>
          </div>
        )}
      </aside>

      {/* Main Wrapper */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        <RecognitionTicker />
        
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 shadow-sm sticky top-0 z-40">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            
            {/* Mobile Left: Hamburger + Logo */}
            <div className="flex items-center gap-3 md:hidden">
              <button
                className="p-2 -ml-2 rounded-lg active:bg-slate-100 dark:active:bg-white/10 md:hover:bg-slate-100 dark:md:hover:bg-white/10 transition-colors shrink-0"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="h-6 w-6 text-slate-600 dark:text-slate-300" /> : <Menu className="h-6 w-6 text-slate-600 dark:text-slate-300" />}
              </button>
              <Link href="/dashboard" className="flex items-center shrink min-w-0">
                <img src="/logo-dark.png" alt="Inter Smart Logo" className="h-8 object-contain dark:hidden" />
                <img src="/logo.png" alt="Inter Smart Logo" className="h-8 object-contain hidden dark:block" />
              </Link>
            </div>

            {/* Desktop Left: Logo when sidebar is collapsed */}
            <div className="hidden md:flex flex-1 items-center">
              {isSidebarCollapsed && (
                <Link href="/dashboard" className="flex items-center shrink min-w-0">
                  <img src="/logo-dark.png" alt="Inter Smart Logo" className="h-8 object-contain dark:hidden" />
                  <img src="/logo.png" alt="Inter Smart Logo" className="h-8 object-contain hidden dark:block" />
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

        {/* Hamburger Menu - Mobile Overlay Drawer */}
        {menuOpen && (
          <div className="md:hidden">
            <div className="fixed inset-0 top-16 bg-black/40 z-[998]" onClick={closeMenu} />
            <div role="navigation" className="fixed top-16 bottom-0 left-0 w-72 bg-slate-900 border-r border-slate-800 shadow-2xl z-[9999] overflow-y-auto py-4">
              <Link href="/profile" onClick={closeMenu} className="px-4 py-4 mb-2 border-b border-slate-800 flex items-center gap-3 active:bg-slate-800 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-amber-400 overflow-hidden flex items-center justify-center text-sm font-bold text-white relative shrink-0">
                  <span>{user?.first_name?.[0]}{user?.last_name?.[0]}</span>
                  {user?.profile_photo_path && <img src={user.profile_photo_path} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs text-slate-400">{user?.role}</p>
                </div>
              </Link>
              
              <nav className="space-y-1 px-2">
                {STANDALONE.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link key={href} href={href} onClick={closeMenu} className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors rounded-xl ${active ? "bg-amber-500/20 text-amber-400" : "text-slate-300 active:bg-slate-800 active:text-white"}`}>
                      <Icon className="h-5 w-5 shrink-0" />
                      {label}
                    </Link>
                  );
                })}
                
                <div className="my-2 border-t border-slate-800" />
                
                {NAV_GROUPS.map((group) => {
                  if (!groupHasVisibleItems(group, userRole)) return null;
                  const visibleItems = group.items.filter((item) => isItemVisible(item, userRole));
                  const isOpen = openGroup === group.id;
                  const groupActive = pathBelongsToGroup(group, pathname);
                  const GroupIcon = group.icon;
                  return (
                    <div key={group.id} className="mt-1">
                      <button onClick={() => toggleGroup(group.id)} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold transition-colors rounded-xl ${groupActive && !isOpen ? "text-amber-400" : "text-slate-300 active:text-white active:bg-slate-800"}`}>
                        <span className="flex items-center gap-3">
                          <GroupIcon className="h-5 w-5 shrink-0" />
                          {group.label}
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
                                <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" onClick={closeMenu} className="flex items-center gap-3 pl-8 pr-3 py-2 text-sm transition-colors rounded-xl text-slate-400 active:bg-slate-800 active:text-white">
                                  {itemContent}
                                </a>
                              );
                            }

                            return (
                              <Link key={item.href} href={item.href} onClick={closeMenu} className={`flex items-center gap-3 pl-8 pr-3 py-2 text-sm transition-colors rounded-xl ${active ? "bg-amber-500/20 text-amber-400 font-semibold" : "text-slate-400 active:bg-slate-800 active:text-white"}`}>
                                {itemContent}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          {/* Breadcrumbs */}
          {pathname !== "/dashboard" && (
            <div className="flex items-center flex-wrap gap-1 text-sm text-slate-500 dark:text-slate-400 mb-7 font-medium">
              <Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Home className="w-4 h-4" />
                Dashboard
              </Link>
              {pathname
                .split("/")
                .filter(Boolean)
                .filter(segment => !["attendance"].includes(segment.toLowerCase()))
                .map((segment, index, array) => {
                  const href = "/" + array.slice(0, index + 1).join("/");
                  const isLast = index === array.length - 1;
                  const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
                  return (
                    <div key={segment + index} className="flex items-center gap-1">
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      {isLast ? (
                        <span className="text-slate-900 dark:text-white font-semibold">{title}</span>
                      ) : (
                        <Link href={href} className="hover:text-slate-900 dark:hover:text-white text-slate-600 dark:text-slate-300">
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
        
        {/* Chatbase AI Assistant Widget */}
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
    </div>
  );
}
