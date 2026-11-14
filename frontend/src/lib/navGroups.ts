import type React from "react";
import {
  CalendarCheck, Briefcase, UserCircle, Download, Users, ShieldCheck, Wallet, TrendingUp,
  ClipboardList, Layers, FolderKanban, Clock, Building2, HeartHandshake, HelpCircle, Puzzle, Laptop,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  roles?: string[];
  external?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ElementType;
  roles?: string[];   // if set, only these roles see the group
  webOnly?: boolean;  // hidden inside the Windows app and the Android shell
  feature?: string;   // if set, hidden unless this module is switched on (GET /features)
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "leaves",
    label: "Leaves",
    shortLabel: "Leaves",
    icon: CalendarCheck,
    items: [
      { href: "/leaves",           label: "All Leaves", roles: ["Super Admin"] },
      { href: "/leaves",           label: "My Leaves", roles: ["Employee", "Team Lead", "HR"] },
      { href: "/leaves/apply",     label: "Apply Leave", roles: ["Employee", "Team Lead"] },
      { href: "/calendar",         label: "Leave Calendar", roles: ["Employee", "Team Lead", "HR"] },
      { href: "/holidays",         label: "Holiday Calendar", roles: ["Super Admin"] },
      { href: "/leaves/approvals", label: "Leave Approvals", roles: ["Super Admin", "Team Lead"] },
      { href: "/leave-balances",   label: "Leave Balances", roles: ["Super Admin"] },
      { href: "/addons/leave-policy", label: "Leave Policy Management", roles: ["Super Admin"] },
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
      { href: "/project-management/bugsmart", label: "BugSmart" },
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
      { href: "/addons", label: "All Add-ons Directory" },
      { href: "/addons/customization", label: "Portal Customization" },
      { href: "/addons/email-management", label: "Email & SMTP Management" },
      { href: "/addons/permissions", label: "Team & Role Permissions" },
      { href: "/addons/menu-layout", label: "Side Menu Arrangement" },
    ],
  },
  {
    id: "app-downloads",
    label: "App Downloads",
    shortLabel: "Apps",
    icon: Download,
    webOnly: true,
    items: [{ href: "/app-downloads", label: "Windows & Android apps" }],
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
      { href: "/community",     label: "Community Feed" },
      { href: "/chat",          label: "Direct Chat" },
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
      { href: "/community",        label: "Community & Chat" },
      { href: "/employees",        label: "Employees",            roles: ["Super Admin", "HR"] },
      { href: "/teams",            label: "Departments",          roles: ["Super Admin", "HR"] },
      { href: "/attendance/management", label: "Attendance Management", roles: ["Super Admin"] },
      { href: "/hall",             label: "The Hall" },
      { href: "/birthday-wishes",  label: "Birthday Wishes" },
      { href: "/leaves/approvals", label: "Leave Approvals",      roles: ["HR"] },
      { href: "/leaves/approvals", label: "My Requests",          roles: ["Employee"] },
      { href: "/recognitions",     label: "Manage Awards",        roles: ["Super Admin"] },
      { href: "/recognitions/leaderboard", label: "Recognition Leaderboard" },
      { href: "/game",             label: "Game" },
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
    id: "sales",
    label: "Sales",
    shortLabel: "Sales",
    icon: TrendingUp,
    feature: "sales", // per-person: GET /features is true only for Super Admin / Sales team
    items: [
      { href: "/sales",          label: "Dashboard" },
      { href: "/sales/leads",    label: "Leads" },
      { href: "/sales/inbox",    label: "Inbox" },
      { href: "/sales/projects", label: "Sales projects" },
      { href: "/sales/completed", label: "Completed and AMC" },
      { href: "/sales/out-of-scope", label: "Out-of-scope requests" },
    ],
  },
  {
    id: "work",
    label: "My Work",
    shortLabel: "Work",
    icon: Layers,
    feature: "workflow", // per-person: GET /features is true only for people with a project on their work list
    items: [
      { href: "/work/inbox", label: "My inbox" },
      { href: "/work", label: "My projects" },
      { href: "/work/team", label: "My team" },
      { href: "/work/go-live", label: "Go-live requests" },
      { href: "/work/qa", label: "QA queue" },
    ],
  },
  {
    id: "appreciation",
    label: "Appreciation",
    shortLabel: "Thanks",
    icon: HeartHandshake,
    feature: "appreciation", // per-person: GET /features is true only for team leads, HR and Project Office
    items: [{ href: "/appreciation", label: "Nominations" }],
  },
  {
    id: "hr_performance",
    label: "Performance",
    shortLabel: "Perf.",
    icon: TrendingUp,
    feature: "hr_performance", // per-person: GET /features is true only for HR and Super Admin
    items: [{ href: "/hr-performance", label: "Performance figures" }],
  },
  {
    id: "customer_feedback",
    label: "Customer feedback",
    shortLabel: "Feedback",
    icon: HelpCircle,
    feature: "customer_feedback", // per-person: GET /features is true only for project managers and HR
    items: [{ href: "/customer-feedback", label: "Feedback notes" }],
  },
  {
    id: "meetings",
    label: "Meetings",
    shortLabel: "Meetings",
    icon: Clock,
    feature: "meetings", // per-person: GET /features is true for every signed-in person once switched on
    items: [{ href: "/meetings", label: "All meetings" }],
  },
  {
    id: "pmo",
    label: "Project Office",
    shortLabel: "PMO",
    icon: ClipboardList,
    feature: "pmo", // per-person: GET /features is true only for Super Admin / PMO team members
    items: [
      { href: "/pmo",           label: "Office projects" },
      { href: "/pmo/approvals", label: "Out-of-scope requests" },
      { href: "/pmo/budget-watch", label: "Out of budget" },
      { href: "/pmo/tracker", label: "Project tracker" },
    ],
  },
  {
    id: "accounts",
    label: "Accounts",
    shortLabel: "Accounts",
    icon: Wallet,
    feature: "accounts", // per-person: GET /features is true only for Super Admin / Accounts team
    items: [
      { href: "/accounts",         label: "Projects & Payments" },
      { href: "/accounts/targets", label: "Sales Targets" },
      { href: "/accounts/amc",     label: "AMC List" },
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

/** Stable id of a menu entry inside the saved menu layout. */
export const navItemKey = (item: NavItem) => `${item.href}|${item.label}`;

export type MenuLayout = {
  groups?: string[];
  items?: Record<string, string[]>;
  hiddenGroups?: string[];
  hiddenItems?: string[];
};

const byOrder = <T,>(list: T[], order: string[] | undefined, key: (x: T) => string): T[] => {
  if (!order || order.length === 0) return list;
  const pos = (x: T) => { const i = order.indexOf(key(x)); return i === -1 ? order.length : i; };
  // entries missing from the saved order (new menu items) keep their default place after the saved ones
  return list.map((x, i) => ({ x, i })).sort((a, b) => pos(a.x) - pos(b.x) || a.i - b.i).map((o) => o.x);
};

/** Apply the Super Admin's arrangement (order + hidden) to the menu. Display only. */
export function applyMenuLayout(groups: NavGroup[], layout?: MenuLayout | null): NavGroup[] {
  if (!layout) return groups;
  const hiddenG = new Set(layout.hiddenGroups || []);
  const hiddenI = new Set(layout.hiddenItems || []);
  return byOrder(groups, layout.groups, (g) => g.id)
    .filter((g) => !hiddenG.has(g.id))
    .map((g) => ({
      ...g,
      items: byOrder(g.items, layout.items?.[g.id], navItemKey).filter((i) => !hiddenI.has(navItemKey(i))),
    }));
}
