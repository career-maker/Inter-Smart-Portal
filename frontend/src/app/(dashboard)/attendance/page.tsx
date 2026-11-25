"use client";

import { useEffect, useRef, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Clock, Loader2 } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { FavoriteButton } from "@/components/layout/FavoriteButton";
import { BiometricPunchTimeline } from "@/components/attendance/BiometricPunchTimeline";
import { DailySummaryCard, EmployeeDateRangeView } from "@/components/attendance";

// Attendance history for the signed-in user. Same views as the Super Admin's per-employee
// view in /attendance/management (specific date, date range), plus a month picker.
// Team Leads can also pick a team member; the backend scopes both endpoints.

type Person = { id: number; first_name: string; last_name: string; employee_code: string };
type Tab = "date" | "month" | "range";

const today = () => format(new Date(), "yyyy-MM-dd");

export default function MyAttendancePage() {
  const { user } = useAuthStore();
  const isTeamLead = user?.role === "Team Lead";

  const [people, setPeople] = useState<Person[]>([]);
  const [personId, setPersonId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("date");

  const [date, setDate] = useState(today);
  const [daily, setDaily] = useState<any | null>(null);
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [rangeStart, setRangeStart] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [rangeEnd, setRangeEnd] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [rangeData, setRangeData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the latest request may update the page (fast person/tab switches).
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!user) return;
    setPersonId(user.id);
    const self: Person = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      employee_code: user.employee_id || "",
    };
    setPeople([self]);
    if (!isTeamLead) return;
    api
      .get("/reports/employee-list")
      .then((res) => {
        const list: Person[] = (res.data?.data || []).map((e: any) => {
          const [first, ...rest] = String(e.name || "").split(" ");
          return { id: e.id, first_name: first, last_name: rest.join(" "), employee_code: e.code || "" };
        });
        setPeople([self, ...list.filter((p) => p.id !== user.id)]);
      })
      .catch(() => {});
  }, [user?.id, isTeamLead]);

  const person = people.find((p) => p.id === personId) || null;

  const loadDay = async (d: string) => {
    if (!personId || !d) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/attendance/details`, { params: { date: d, user_id: personId } });
      if (seq !== requestSeq.current) return;
      setDaily(res.data?.data === null ? null : res.data);
    } catch (e: any) {
      if (seq !== requestSeq.current) return;
      setDaily(null);
      setError(e.response?.data?.message || "Failed to load attendance details");
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  const loadRange = async (start: string, end: string) => {
    if (!personId || !start || !end) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/reports/attendance-summary`, {
        params: { start_date: start, end_date: end, user_id: personId },
      });
      if (seq !== requestSeq.current) return;
      setRangeData(res.data?.data?.[0] || null);
    } catch (e: any) {
      if (seq !== requestSeq.current) return;
      setRangeData(null);
      setError(e.response?.data?.message || "Failed to load attendance history");
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  const monthBounds = (m: string) => {
    const d = new Date(`${m}-01T00:00:00`);
    return [format(startOfMonth(d), "yyyy-MM-dd"), format(endOfMonth(d), "yyyy-MM-dd")] as const;
  };

  // Reload whenever the person, tab or period changes.
  useEffect(() => {
    if (!personId) return;
    if (tab === "date") loadDay(date);
    else if (tab === "month" && month) loadRange(...monthBounds(month));
    else if (tab === "range") loadRange(rangeStart, rangeEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, tab, date, month, rangeStart, rangeEnd]);

  const tabClass = (t: Tab) =>
    `px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
      tab === t
        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold"
        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
    }`;

  const inputClass =
    "bg-transparent border-0 text-slate-900 dark:text-white text-sm font-medium focus:outline-none cursor-pointer";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Clock aria-hidden="true" /> Attendance
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            {isTeamLead ? "Attendance history for you and your team." : "Your attendance history."}
          </p>
        </div>
        <FavoriteButton label="Attendance" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-4 sm:p-5 flex flex-wrap items-center gap-3">
        {isTeamLead && people.length > 1 && (
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Employee
            <select
              value={personId ?? ""}
              onChange={(e) => setPersonId(Number(e.target.value))}
              className="px-3 py-1.5 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-w-[16rem]"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === user?.id ? `Me (${p.first_name} ${p.last_name})` : `${p.first_name} ${p.last_name}`}
                  {p.employee_code ? ` - ${p.employee_code}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        <div
          role="tablist"
          aria-label="Attendance period"
          className="inline-flex p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
        >
          <button role="tab" aria-selected={tab === "date"} onClick={() => setTab("date")} className={tabClass("date")}>
            Date
          </button>
          <button role="tab" aria-selected={tab === "month"} onClick={() => setTab("month")} className={tabClass("month")}>
            Month
          </button>
          <button role="tab" aria-selected={tab === "range"} onClick={() => setTab("range")} className={tabClass("range")}>
            Custom Range
          </button>
        </div>

        {tab === "date" && (
          <label className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Date:
            <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </label>
        )}
        {tab === "month" && (
          <label className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Month:
            <input
              type="month"
              value={month}
              max={format(new Date(), "yyyy-MM")}
              onChange={(e) => setMonth(e.target.value)}
              className={inputClass}
            />
          </label>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {person && tab !== "date" && (
        <EmployeeDateRangeView
          employee={person}
          startDate={tab === "month" ? monthBounds(month)[0] : rangeStart}
          endDate={tab === "month" ? monthBounds(month)[1] : rangeEnd}
          data={rangeData}
          isLoading={loading}
          onRangeChange={(start, end) => {
            // The view's presets and date inputs switch to a custom range.
            setRangeStart(start);
            setRangeEnd(end);
            setTab("range");
          }}
        />
      )}

      {tab === "date" &&
        (loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--portal-primary-color)]" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading attendance for {date}...</p>
          </div>
        ) : daily ? (
          <div className="space-y-6">
            <DailySummaryCard
              attendance={daily}
              totalBreaks={daily.completed_breaks?.length || 0}
              isCurrentlyWorking={daily.is_currently_working}
            />
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-6">
              <div className="pb-4 border-b border-slate-200 dark:border-slate-700/60 mb-5">
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">Biometric Punch Timeline</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  All biometric punch events in chronological order
                </p>
              </div>
              <BiometricPunchTimeline punches={daily.raw_punches || []} isCurrentlyWorking={daily.is_currently_working} />
            </div>
          </div>
        ) : (
          !error && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 p-12 text-center">
              <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No attendance data found for {date}</p>
              <p className="text-xs text-slate-400 mt-1">No punch on this date, or it is a holiday/weekend.</p>
            </div>
          )
        ))}
    </div>
  );
}
