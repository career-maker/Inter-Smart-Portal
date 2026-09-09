import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import teamPermissionsApi from "@/services/teamPermissions";

export interface BugzillaAuthInfo {
  loading: boolean;
  isSuperAdmin: boolean;
  canView: boolean;
  canReport: boolean;
  canDevelop: boolean;
  capability: "Super Admin" | "Developer" | "Reporter" | "Viewer" | "None";
}

export function useBugzillaAuth(): BugzillaAuthInfo {
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  const userRoleStr = (user?.role || "").toLowerCase();
  const isSuperAdmin = userRoleStr === "super admin";

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    if (isSuperAdmin) {
      setLoading(false);
      return;
    }

    teamPermissionsApi
      .getMyPermissions()
      .then((res) => {
        setPermissions(res.permissions || {});
      })
      .catch((err) => {
        console.warn("Failed to load user Bugzilla permissions", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated, isSuperAdmin]);

  if (isSuperAdmin) {
    return {
      loading: false,
      isSuperAdmin: true,
      canView: true,
      canReport: true,
      canDevelop: true,
      capability: "Super Admin",
    };
  }

  const canDevelop = Boolean(permissions.bugzilla_developer);
  const canReport = Boolean(canDevelop || permissions.bugzilla_reporter);
  const canView = Boolean(canReport || permissions.bugzilla_viewer);

  let capability: "Super Admin" | "Developer" | "Reporter" | "Viewer" | "None" = "None";
  if (canDevelop) capability = "Developer";
  else if (canReport) capability = "Reporter";
  else if (canView) capability = "Viewer";

  return {
    loading,
    isSuperAdmin: false,
    canView,
    canReport,
    canDevelop,
    capability,
  };
}
