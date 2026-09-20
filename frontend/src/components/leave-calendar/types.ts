export type CalendarView = "month" | "week" | "list";

export type ListFilter = "all" | "nonworking" | "holiday" | "weekend" | "leave" | "wfh";

export interface CalendarEventUser {
  id: number;
  name: string;
  designation?: string | null;
  profile_photo_path?: string | null;
  is_self?: boolean;
}

export interface CalendarEvent {
  id: string | number;
  title: string;
  date?: string;
  end_date?: string;
  type: "Holiday" | "WFH" | "Leave" | string;
  status?: "Approved" | "Pending" | "Rejected" | string;
  reason?: string;
  duration?: string | null;
  days?: number | string | null;
  user?: CalendarEventUser | null;
}

export interface CalendarMeta {
  is_team_view: boolean;
  team_name: string | null;
  member_count: number;
}

// What the settings popover can hide. Company holidays and weekends always show.
export interface CalendarPrefs {
  leave: boolean;
  wfh: boolean;
  team: boolean;
}

export const DEFAULT_PREFS: CalendarPrefs = { leave: true, wfh: true, team: true };

export interface MonthStats {
  companyHolidays: number;
  weekends: number;
  nonWorkingDays: number;
  leaves: { approved: number; pending: number; total: number };
}

export interface UpcomingItem {
  key: string;
  label: string;
  kind: "holiday" | "weekend" | "leave" | "wfh";
}

export interface UpcomingDay {
  date: Date;
  items: UpcomingItem[];
  more: number;
}
