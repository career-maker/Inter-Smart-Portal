/**
 * Role-Based Color Utilities
 * Provides consistent color tokens for different user roles
 */

export type UserRole = "Super Admin" | "Team Lead" | "Employee" | "HR";

export type RoleColorPalette = {
  badge: string;
  card: string;
  text: string;
  bg: string;
  border: string;
  accent: string;
  lightBg: string;
};

export const getRoleColors = (role: UserRole | null | undefined): RoleColorPalette => {
  if (!role) return getRoleColors("Employee");

  switch (role) {
    case "Super Admin":
      return {
        badge: "role-admin-badge",
        card: "role-admin-card",
        text: "role-admin-text",
        bg: "bg-gradient-to-br from-rose-500/10 to-red-500/10",
        border: "border-rose-500/30",
        accent: "text-rose-500",
        lightBg: "bg-rose-50 dark:bg-rose-900/20",
      };
    case "Team Lead":
      return {
        badge: "role-lead-badge",
        card: "role-lead-card",
        text: "role-lead-text",
        bg: "bg-gradient-to-br from-indigo-500/10 to-cyan-500/10",
        border: "border-indigo-500/30",
        accent: "text-indigo-500",
        lightBg: "bg-indigo-50 dark:bg-indigo-900/20",
      };
    case "HR":
    case "Employee":
    default:
      return {
        badge: "role-employee-badge",
        card: "role-employee-card",
        text: "role-employee-text",
        bg: "bg-gradient-to-br from-emerald-500/10 to-amber-500/10",
        border: "border-emerald-500/30",
        accent: "text-emerald-500",
        lightBg: "bg-emerald-50 dark:bg-emerald-900/20",
      };
  }
};

export const getRoleHeaderClass = (role: UserRole | null | undefined) => {
  const colors = getRoleColors(role);
  return `${colors.lightBg} border-b ${colors.border}`;
};

export const getRoleBadgeClass = (role: UserRole | null | undefined) => {
  return getRoleColors(role).badge;
};

export const getStatusColor = (status: string) => {
  const lowerStatus = status.toLowerCase();

  if (lowerStatus.includes("approved") || lowerStatus.includes("active")) {
    return "badge-success";
  }
  if (lowerStatus.includes("pending") || lowerStatus.includes("draft")) {
    return "badge-warning";
  }
  if (lowerStatus.includes("rejected") || lowerStatus.includes("denied")) {
    return "badge-error";
  }
  return "badge-info";
};

/**
 * Get semantic text color based on theme and context
 */
export const getSemanticTextColor = (variant: "primary" | "secondary" | "tertiary" | "muted" = "secondary") => {
  const colorMap = {
    primary: "text-primary",
    secondary: "text-secondary",
    tertiary: "text-tertiary",
    muted: "text-muted",
  };
  return colorMap[variant];
};

/**
 * Get semantic background color
 */
export const getSemanticBgColor = (variant: "primary" | "secondary" | "tertiary" = "primary") => {
  const colorMap = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    tertiary: "bg-tertiary",
  };
  return colorMap[variant];
};

/**
 * Get semantic border color
 */
export const getSemanticBorderColor = (variant: "primary" | "secondary" | "tertiary" = "primary") => {
  const colorMap = {
    primary: "border-primary",
    secondary: "border-secondary",
    tertiary: "border-tertiary",
  };
  return colorMap[variant];
};

/**
 * Combine role and semantic colors for a card
 */
export const getSemanticCardClass = (role?: UserRole | null) => {
  const roleColors = getRoleColors(role);
  return `semantic-card ${roleColors.border}`;
};
