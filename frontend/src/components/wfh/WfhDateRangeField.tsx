"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ArrowRight, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

type Target = "start" | "end";

interface WfhDateRangeFieldProps {
  /** "range" for Full Day WFH, "single" for half-day types */
  mode: "range" | "single";
  /** yyyy-MM-dd, or "" when nothing is selected */
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  invalid?: boolean;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const toKey = (d: Date) => format(d, "yyyy-MM-dd");
const display = (key: string) => (key ? format(parseISO(key), "dd-MM-yyyy") : "");

function Segment({
  caption,
  value,
  active,
  onClick,
}: {
  caption: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={active}
      className={`portal-focus flex min-w-0 flex-col items-start rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer sm:px-3 ${
        active ? "portal-accent-tint" : "hover:bg-black/5"
      }`}
    >
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{caption}</span>
      <span className="text-sm font-semibold text-slate-800 sm:text-[15px] dark:text-slate-100">{value}</span>
    </button>
  );
}

export function WfhDateRangeField({ mode, start, end, onChange, invalid = false }: WfhDateRangeFieldProps) {
  const isRange = mode === "range";
  const effectiveEnd = end || start;

  const [open, setOpen] = useState(false);
  // Which date the calendar is currently setting
  const [target, setTarget] = useState<Target>("start");
  const [month, setMonth] = useState<Date>(() => (start ? parseISO(start) : new Date()));
  const [hover, setHover] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }),
    [month]
  );

  const focusMonth = (next: Target) => {
    const key = next === "end" ? effectiveEnd : start;
    setMonth(key ? parseISO(key) : new Date());
    setHover(null);
  };

  const openAt = (next: Target) => {
    if (open && target === next) {
      setOpen(false);
      return;
    }
    setTarget(next);
    focusMonth(next);
    setOpen(true);
  };

  const switchTarget = (next: Target) => {
    setTarget(next);
    focusMonth(next);
  };

  const pick = (key: string) => {
    if (!isRange) {
      onChange(key, key);
      setOpen(false);
      return;
    }
    if (target === "start") {
      // Keep the current end when it is still on or after the new start; then ask for the end
      onChange(key, effectiveEnd && effectiveEnd >= key ? effectiveEnd : key);
      setTarget("end");
      return;
    }
    onChange(start || key, key);
    setOpen(false);
  };

  // While choosing the end date, preview the range up to the hovered day
  const previewEnd = target === "end" && hover && hover >= start ? hover : effectiveEnd;

  return (
    <div className="relative" ref={rootRef}>
      <div
        className={`flex w-full items-center gap-1 rounded-xl border bg-white py-1.5 pl-3 pr-12 transition-colors sm:gap-2 dark:bg-slate-900 ${
          invalid ? "border-rose-400" : open ? "portal-accent-border-solid" : "border-slate-200 dark:border-slate-700"
        }`}
      >
        <CalendarIcon className="mr-1 h-5 w-5 shrink-0 text-slate-500" />
        {!start ? (
          <button
            type="button"
            onClick={() => openAt("start")}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="portal-focus flex-1 rounded-lg px-2 py-3 text-left text-[15px] text-slate-400 cursor-pointer"
          >
            {isRange ? "Select date range" : "Select date"}
          </button>
        ) : isRange ? (
          <>
            <Segment caption="From" value={display(start)} active={open && target === "start"} onClick={() => openAt("start")} />
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
            <Segment caption="To" value={display(effectiveEnd)} active={open && target === "end"} onClick={() => openAt("end")} />
          </>
        ) : (
          <Segment caption="Date" value={display(start)} active={open} onClick={() => openAt("start")} />
        )}
      </div>

      {start && (
        <button
          type="button"
          onClick={() => {
            onChange("", "");
            setTarget("start");
          }}
          aria-label="Clear dates"
          title="Clear dates"
          className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-slate-300 text-white transition-colors hover:bg-slate-400 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={isRange ? "Choose WFH dates" : "Choose WFH date"}
          className="absolute left-0 top-full z-30 mt-2 w-[19.5rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95 duration-150 dark:border-slate-700 dark:bg-slate-900"
        >
          {isRange && (
            <div className="portal-accent-tint mb-3 grid grid-cols-2 gap-1 rounded-xl p-1" role="group" aria-label="Which date to set">
              {(["start", "end"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTarget(t)}
                  aria-pressed={target === t}
                  className={`rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    target === t ? "portal-accent-solid shadow-sm" : "portal-accent-text hover:brightness-90"
                  }`}
                >
                  {t === "start" ? "From date" : "To date"}
                </button>
              ))}
            </div>
          )}

          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-black/5 dark:text-slate-300 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{format(month, "MMMM yyyy")}</span>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-black/5 dark:text-slate-300 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="py-1 text-[11px] font-bold text-slate-400">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7" onMouseLeave={() => setHover(null)}>
            {days.map((day) => {
              const key = toKey(day);
              const inMonth = isSameMonth(day, month);
              // The end date cannot be before the start date
              const disabled = isRange && target === "end" && !!start && key < start;
              const isEdge = !!start && (key === start || (isRange && key === previewEnd));
              const inRange = isRange && !!start && key > start && key < previewEnd;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(key)}
                  onMouseEnter={() => setHover(key)}
                  aria-label={format(day, "EEEE, d MMMM yyyy")}
                  aria-pressed={isEdge}
                  className={`my-0.5 flex h-9 items-center justify-center text-sm font-semibold transition-colors ${
                    disabled ? "cursor-not-allowed" : "cursor-pointer"
                  } ${
                    isEdge
                      ? "portal-accent-solid rounded-lg"
                      : inRange
                      ? "portal-accent-tint-strong portal-accent-text"
                      : `rounded-lg ${disabled ? "" : "hover:bg-black/5 dark:hover:bg-slate-800"} ${
                          disabled || !inMonth
                            ? "text-slate-300 dark:text-slate-600"
                            : "text-slate-800 dark:text-slate-100"
                        }`
                  } ${isToday(day) && !isEdge ? "portal-accent-text underline underline-offset-4" : ""}`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {isRange && (
            <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800">
              {target === "start"
                ? "Choose the first day of your WFH."
                : "Now choose the last day. Click outside to keep it as is."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
