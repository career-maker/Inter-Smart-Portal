"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useCustomization } from "@/context/CustomizationContext";

const ROUTE_NAME_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/attendance": "Attendance",
  "/attendance/management": "Attendance Management",
  "/attendance/report": "Attendance Report",
  "/employees": "Employee Management",
  "/employees/create": "Add Employee",
  "/leaves": "Leaves",
  "/leaves/apply": "Apply Leave",
  "/leaves/approvals": "Leave Approvals",
  "/leaves/balances": "Leave Balances",
  "/leave-balances": "Leave Balances",
  "/manage-leaves": "Manage Leaves",
  "/wfh": "Work From Home",
  "/wfh/apply": "Apply WFH",
  "/holidays": "Holidays",
  "/projects": "Projects",
  "/project-management": "Project Management",
  "/project-management/projects": "Projects",
  "/project-management/tasks": "Tasks Board",
  "/project-management/tasks/my": "My Tasks",
  "/project-management/tasks/completed": "Completed Tasks",
  "/project-management/tasks/forecast": "Task Forecast",
  "/project-management/tasks/overdue": "Overdue Tasks",
  "/project-management/hubstaff": "Hubstaff Tracking",
  "/project-management/status": "Project Status",
  "/addons": "Add-on Features",
  "/addons/customization": "Portal Customization",
  "/customization": "Portal Customization",
  "/addons/email-management": "Email & SMTP Settings",
  "/addons/emergency-contacts": "Emergency Contacts",
  "/addons/leave-policy": "Leave Policy Management",
  "/addons/permissions": "Team & Role Permissions",
  "/addons/storage": "Storage Management",
  "/project-management/addons": "Add-on Features",
  "/project-management/addons/customization": "Portal Customization",
  "/project-management/addons/email-management": "Email & SMTP Settings",
  "/project-management/addons/emergency-contacts": "Emergency Contacts",
  "/project-management/addons/leave-policy": "Leave Policy Management",
  "/project-management/addons/permissions": "Team & Role Permissions",
  "/project-management/addons/storage": "Storage Management",
  "/project-management/bug-reports": "Bug Reports",
  "/project-management/bugzilla": "bugSmart",
  "/project-management/bugzilla/overview": "bugSmart Overview",
  "/project-management/bugzilla/bugs": "bugSmart Bugs",
  "/project-management/bugzilla/bugs/new": "Report Defect - bugSmart",
  "/project-management/bugzilla/projects": "bugSmart Projects",
  "/project-management/bugzilla/reports": "bugSmart Reports",
  "/project-management/bugzilla/saved-searches": "bugSmart Saved Searches",
  "/project-management/bugzilla/permissions": "bugSmart Team Permissions",
  "/project-management/task-catalog": "Task Catalog",
  "/project-management/checklist-templates": "Checklist Templates",
  "/ta": "Travel Allowance",
  "/ta/apply": "Apply Travel Allowance",
  "/ta/status": "TA Status",
  "/ta/management": "Manage TA Requests",
  "/community": "Community & Chat",
  "/announcements": "Announcements",
  "/activities": "Recent Activities",
  "/documents": "Document Requests",
  "/policies": "HR Policies",
  "/profile": "My Profile",
  "/profile-requests": "Profile Edit Requests",
  "/profile/edit-requests": "Profile Edit Requests",
  "/reports": "Reports & Analytics",
  "/reports/employees": "Employee Report",
  "/reports/attendance": "Attendance Summary",
  "/reports/leaves": "Leave Report",
  "/audit-logs": "Audit Logs",
  "/birthday-wishes": "Birthday Wishes",
  "/calendar": "Company Calendar",
  "/hall": "Town Hall",
  "/issues": "Issues & Support",
  "/issues/new": "Raise Issue",
  "/notifications": "Notifications",
  "/recognitions": "Recognitions & Awards",
  "/recognitions/leaderboard": "Leaderboard",
  "/teams": "Teams",
  "/teams/create": "Create Team",
  "/settings": "Settings",
  "/login": "Sign In",
};

function formatSegment(seg: string): string {
  return seg
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolvePageName(pathname: string): string {
  if (!pathname || pathname === "/") return "Dashboard";

  const trimmed = pathname.replace(/\/$/, "");

  // 1. Direct match in lookup table
  if (ROUTE_NAME_MAP[trimmed]) {
    return ROUTE_NAME_MAP[trimmed];
  }

  // 2. Dynamic match for known route prefixes
  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";

  if (segments[0] === "attendance" && segments[1] === "details") {
    return "Attendance Details";
  }
  if (segments[0] === "employees" && segments.length > 1) {
    return segments[1] === "create" ? "Add Employee" : "Employee Profile";
  }
  if (segments[0] === "teams" && segments.length > 1) {
    return segments[1] === "create" ? "Create Team" : "Team Details";
  }
  if (segments[0] === "issues" && segments.length > 1) {
    return segments[1] === "new" ? "Raise Issue" : "Issue Details";
  }
  if (segments[0] === "project-management" && segments[1] === "projects" && segments.length > 2) {
    return "Project Details";
  }
  if (segments[0] === "project-management" && segments[1] === "tasks" && segments.length > 2) {
    return "Task Details";
  }

  // 3. Fallback to formatting the last URL segment
  const lastSeg = segments[segments.length - 1];
  return formatSegment(lastSeg);
}

export function PageTitleManager() {
  const pathname = usePathname();
  const { settings } = useCustomization();

  const computedTitle = useMemo(() => {
    const baseTitle = settings?.page_title_base?.trim() || "Inter Smart";
    const pageName = resolvePageName(pathname || "");
    const separator = settings?.title_separator?.trim() || "|";
    let format = settings?.page_title_format?.trim() || `{title} ${separator} {pagename}`;

    let title = format
      .replace(/\{title\}/gi, baseTitle)
      .replace(/\{pagename\}/gi, pageName)
      .replace(/\{page_name\}/gi, pageName)
      .replace(/\{page\}/gi, pageName)
      .replace(/\{separator\}/gi, separator)
      .replace(/\{sep\}/gi, separator)
      .trim();

    if (!title || title === format) {
      title = `${baseTitle} ${separator} ${pageName}`;
    }

    return title;
  }, [pathname, settings?.page_title_base, settings?.page_title_format, settings?.title_separator]);

  useEffect(() => {
    if (typeof document === "undefined" || !computedTitle) return;

    if (document.title !== computedTitle) {
      document.title = computedTitle;
    }
  }, [computedTitle]);

  return null;
}
