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

export function WfhDateRangeField({ mode, start, end, onChange, invalid = false }: WfhDateRangeFieldProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => (start ? parseISO(start) : new Date()));
  // Range mode: first date picked, waiting for the end date
  const [awaitingEnd, setAwaitingEnd] = useState(false);
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

  const toggle = () => {
    if (!open) {
      setMonth(start ? parseISO(start) : new Date());
      setAwaitingEnd(false);
      setHover(null);
    }
    setOpen((o) => !o);
  };

  const pick = (key: string) => {
    if (mode === "single") {
      onChange(key, key);
      setOpen(false);
      return;
    }
    if (!awaitingEnd || !start) {
      // First click: already a valid one-day range; the next click extends it
      onChange(key, key);
      setAwaitingEnd(true);
      return;
    }
    if (key < start) {
      onChange(key, key); // earlier than the start: restart from here
      return;
    }
    onChange(start, key);
    setAwaitingEnd(false);
    setOpen(false);
  };

  // While choosing the end date, preview the range up to the hovered day
  const rangeEnd = awaitingEnd && hover && hover >= start ? hover : end || start;
  const isRange = mode === "range";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`portal-focus flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 pr-12 text-left transition-colors hover:border-slate-300 dark:bg-slate-900 ${
          invalid
            ? "border-rose-400"
            : open
            ? "portal-accent-border-solid"
            : "border-slate-200 dark:border-slate-700"
        }`}
      >
        <CalendarIcon className="h-5 w-5 shrink-0 text-slate-500" />
        {start ? (
          <span className="flex items-center gap-3 text-[15px] font-semibold text-slate-800 dark:text-slate-100">
            <span>{display(start)}</span>
            {isRange && (
              <>
                <ArrowRight className="h-4 w-4 text-slate-400" />
                <span>{display(end || start)}</span>
              </>
            )}
          </span>
        ) : (
          <span className="text-[15px] text-slate-400">{isRange ? "Select date range" : "Select date"}</span>
        )}
      </button>

      {start && (
        <button
          type="button"
          onClick={() => {
            onChange("", "");
            setAwaitingEnd(false);
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
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{format(month, "MMMM yyyy")}</span>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
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
              const isEdge = !!start && (key === start || (isRange && key === rangeEnd));
              const inRange = isRange && !!start && key > start && key < rangeEnd;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pick(key)}
                  onMouseEnter={() => setHover(key)}
                  aria-label={format(day, "EEEE, d MMMM yyyy")}
                  aria-pressed={isEdge}
                  className={`my-0.5 flex h-9 items-center justify-center text-sm font-semibold transition-colors cursor-pointer ${
                    isEdge
                      ? "portal-accent-solid rounded-lg"
                      : inRange
                      ? "portal-accent-tint-strong portal-accent-text"
                      : `rounded-lg hover:bg-black/5 dark:hover:bg-slate-800 ${
                          inMonth ? "text-slate-800 dark:text-slate-100" : "text-slate-300 dark:text-slate-600"
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
              {awaitingEnd
                ? "Now pick the end date, or click outside to keep a single day."
                : "Pick a start date, then an end date."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
