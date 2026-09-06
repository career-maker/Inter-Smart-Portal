"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCustomization } from "@/context/CustomizationContext";

const ROUTE_NAME_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/attendance": "Attendance",
  "/attendance/management": "Attendance Management",
  "/attendance/report": "Attendance Report",
  "/employees": "Employee Management",
  "/leaves": "Leaves",
  "/leaves/apply": "Apply Leave",
  "/leaves/balances": "Leave Balances",
  "/wfh": "Work From Home",
  "/wfh/apply": "Apply WFH",
  "/holidays": "Holidays",
  "/projects": "Projects",
  "/project-management": "Project Management",
  "/project-management/addons": "Add-on Features",
  "/project-management/addons/customization": "Portal Customization",
  "/project-management/addons/email-management": "Email & SMTP Management",
  "/project-management/addons/leave-policy": "Leave Policy Management",
  "/project-management/addons/permissions": "Team & Role Permissions",
  "/project-management/bug-reports": "Bug Tracker & Reports",
  "/project-management/task-catalog": "Task Catalog",
  "/project-management/checklist-templates": "Checklist Templates",
  "/ta": "Travel Allowance",
  "/ta/apply": "Apply for TA",
  "/ta/status": "TA Status",
  "/ta/management": "Manage TA Requests",
  "/community": "Community & Chat",
  "/announcements": "Announcements",
  "/documents": "Document Requests",
  "/policies": "HR Policies",
  "/profile": "My Profile",
  "/profile/edit-requests": "Profile Edit Requests",
  "/reports": "Reports",
  "/reports/employees": "Employee Report",
  "/reports/attendance": "Attendance Summary",
  "/reports/leaves": "Leave Report",
  "/audit-logs": "Audit Logs",
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

  // 1. Direct match in lookup table
  if (ROUTE_NAME_MAP[pathname]) {
    return ROUTE_NAME_MAP[pathname];
  }

  // 2. Trailing slash check
  const trimmed = pathname.replace(/\/$/, "");
  if (ROUTE_NAME_MAP[trimmed]) {
    return ROUTE_NAME_MAP[trimmed];
  }

  // 3. Dynamic match for known route prefixes
  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";

  // Check subroutes like /project-management/projects/[id]
  if (segments[0] === "project-management" && segments[1] === "projects") {
    return "Project Details";
  }
  if (segments[0] === "employees" && segments.length > 1) {
    return "Employee Profile";
  }

  // Format last segment
  const lastSeg = segments[segments.length - 1];
  return formatSegment(lastSeg);
}

export function PageTitleManager() {
  const pathname = usePathname();
  const { settings } = useCustomization();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const baseTitle = settings.page_title_base || "Inter Smart";
    const pageName = resolvePageName(pathname || "");
    const separator = settings.title_separator || "|";
    let format = settings.page_title_format || `{title} ${separator} {pagename}`;

    let computedTitle = format
      .replace(/\{title\}/gi, baseTitle)
      .replace(/\{pagename\}/gi, pageName)
      .replace(/\{separator\}/gi, separator)
      .replace(/\{sep\}/gi, separator);

    // Fallback if neither tag was replaced
    if (computedTitle === format) {
      computedTitle = `${baseTitle} ${separator} ${pageName}`;
    }

    document.title = computedTitle;
  }, [pathname, settings.page_title_base, settings.page_title_format, settings.title_separator]);

  return null;
}
