"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { CalendarPrefs, CalendarView } from "./types";

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "list", label: "List" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface CalendarToolbarProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  label: string;
  /** Month/year jump popover is only offered outside the week view */
  pickerEnabled: boolean;
  year: number;
  monthIndex: number;
  onPickMonth: (monthIndex: number) => void;
  onPickYear: (year: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  prefs: CalendarPrefs;
  onPrefsChange: (prefs: CalendarPrefs) => void;
  showTeamToggle: boolean;
}

const navBtn =
  "flex h-10 w-10 items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer";

export function CalendarToolbar({
  view,
  onViewChange,
  label,
  pickerEnabled,
  year,
  monthIndex,
  onPickMonth,
  onPickYear,
  onPrev,
  onNext,
  onToday,
  prefs,
  onPrefsChange,
  showTeamToggle,
}: CalendarToolbarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (pickerRef.current && !pickerRef.current.contains(target)) setPickerOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(target)) setSettingsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const prefRows: { key: keyof CalendarPrefs; label: string; hint: string }[] = [
    { key: "leave", label: "Leave", hint: "Approved and pending leave" },
    { key: "wfh", label: "Work from home", hint: "Approved and pending WFH" },
    ...(showTeamToggle
      ? [{ key: "team" as const, label: "Team members", hint: "Leave and WFH of your team" }]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
      {/* Left: prev / next + label */}
      <div className="flex items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900">
          <button type="button" onClick={onPrev} className={`${navBtn} border-r border-slate-200 dark:border-slate-700`} title="Previous" aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={onNext} className={navBtn} title="Next" aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="relative" ref={pickerRef}>
          {pickerEnabled ? (
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-lg font-extrabold text-[#0B1F4B] transition-colors hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800 cursor-pointer"
              title="Jump to month"
            >
              {label}
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          ) : (
            <span className="px-1.5 text-lg font-extrabold text-[#0B1F4B] dark:text-white">{label}</span>
          )}

          {pickerOpen && (
            <div className="absolute left-0 top-full z-40 mt-2 w-72 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 duration-150 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500">Year</span>
                <div className="flex items-center gap-1">
                  {[year - 1, year, year + 1].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        onPickYear(yr);
                        setPickerOpen(false);
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                        yr === year
                          ? "bg-blue-600 text-white"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS.map((m, idx) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onPickMonth(idx);
                      setPickerOpen(false);
                    }}
                    className={`rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      idx === monthIndex
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: view switch, Today, display settings */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1" role="group" aria-label="Calendar view">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onViewChange(v.id)}
              aria-pressed={view === v.id}
              className={`h-10 rounded-xl px-3 text-sm font-bold transition-colors cursor-pointer sm:px-4 ${
                view === v.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToday}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 sm:px-4 shadow-xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
        >
          Today
        </button>

        <div className="relative" ref={settingsRef}>
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            aria-expanded={settingsOpen}
            title="Display settings"
            aria-label="Display settings"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Settings2 className="h-4 w-4" />
          </button>

          {settingsOpen && (
            <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 duration-150 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">Show on calendar</p>
              <div className="mt-3 space-y-3">
                {prefRows.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{row.label}</p>
                      <p className="truncate text-xs text-slate-400">{row.hint}</p>
                    </div>
                    <Switch
                      checked={prefs[row.key]}
                      onCheckedChange={(checked) => onPrefsChange({ ...prefs, [row.key]: checked })}
                      aria-label={`Show ${row.label}`}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800">
                Company holidays and weekends always show.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
