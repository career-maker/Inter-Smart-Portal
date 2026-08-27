import { parseISO } from "date-fns";
import { TaskStatus } from "@/types/pm";

export interface TaskOverdueInfo {
  isOverdue: boolean;
  delayDays: number;
  isCompletedOverdue: boolean;
  isTodayDue: boolean;
}

/**
 * Returns current timestamp in Indian Standard Time (IST, UTC+05:30)
 */
export function getNowIST(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 5.5 * 3600000);
}

/**
 * Parses a date string (YYYY-MM-DD or ISO) into an IST Date at specific hour and minute
 */
export function parseDateToIST(dateStr: string, hour = 0, minute = 0, second = 0): Date | null {
  try {
    const cleanDate = dateStr.split("T")[0];
    const [year, month, day] = cleanDate.split("-").map(Number);
    if (!year || !month || !day) return null;

    // Create UTC Date matching IST target
    // IST is UTC + 5:30 -> UTC hour = hour - 5.5
    const utcHour = hour - 5.5;
    const d = new Date(Date.UTC(year, month - 1, day, Math.floor(utcHour), (utcHour % 1 !== 0 ? 30 : 0) + minute, second));
    return d;
  } catch {
    return null;
  }
}

/**
 * Core Overdue & Delay Days Evaluator based on IST specifications:
 * 1. Active tasks (In Progress, Yet to Start, QA, On Hold, Being Developed):
 *    - Daily cutoff is 6:30 PM (18:30 IST) on the Due Date.
 *    - If current IST > Due Date @ 18:30 IST, flagged as Overdue with delay days (! Nd).
 * 2. Completed tasks:
 *    - Grace period up to 11:59:59 PM (23:59 IST) on Due Date.
 *    - If completed after 11:59 PM IST on Due Date, flagged as Completed (Overdue).
 * 3. Rejected / Forecast tasks:
 *    - Never counted as overdue.
 */
export function getTaskOverdueInfo(
  dueDateStr?: string | null,
  status?: TaskStatus | string,
  completedAtStr?: string | null
): TaskOverdueInfo {
  const result: TaskOverdueInfo = {
    isOverdue: false,
    delayDays: 0,
    isCompletedOverdue: false,
    isTodayDue: false,
  };

  if (!dueDateStr || typeof dueDateStr !== "string") {
    return result;
  }

  const normalizedStatus = (status || "").trim();

  // Rejected / Forecast tasks are never overdue
  if (normalizedStatus === "Rejected" || normalizedStatus === "Forecast") {
    return result;
  }

  const nowIST = getNowIST();
  const cleanDueDate = dueDateStr.split("T")[0];

  // Active Tasks Cutoff: 6:30 PM (18:30 IST) on due date
  const cutoffIST = parseDateToIST(cleanDueDate, 18, 30, 0);
  if (!cutoffIST) return result;

  // Check if due date is today in IST
  const todayISTStr = nowIST.toISOString().split("T")[0];
  result.isTodayDue = cleanDueDate === todayISTStr;

  if (normalizedStatus === "Completed") {
    // Completed Tasks Cutoff: 11:59:59 PM (23:59:59 IST) on due date
    const completedCutoffIST = parseDateToIST(cleanDueDate, 23, 59, 59);
    if (completedCutoffIST) {
      const completedTime = completedAtStr ? new Date(completedAtStr) : nowIST;
      if (completedTime.getTime() > completedCutoffIST.getTime()) {
        result.isCompletedOverdue = true;
      }
    }
    return result;
  }

  // For active tasks: check if past 6:30 PM IST on due date
  if (nowIST.getTime() > cutoffIST.getTime()) {
    result.isOverdue = true;
    const diffMs = nowIST.getTime() - cutoffIST.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    result.delayDays = Math.max(1, diffDays);
  }

  return result;
}
