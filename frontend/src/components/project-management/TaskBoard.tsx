"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RotateCcw, Users, Rows3, ExternalLink, Loader2, Pencil, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { ProjectTask, TaskPriority, TaskStatus, TASK_STATUSES } from "@/types/pm";
import { PRIORITY_COLORS, STATUS_COLORS, TaskPrioritySelect, TaskStatusSelect } from "@/components/project-management/priorityPalette";
import { EditTaskModal } from "@/components/project-management/EditTaskModal";

/* Every task gets its own hue from its id, so neighbouring cards never share a colour. */
const HUES = [162, 8, 36, 204, 262, 332, 92, 188, 22, 292, 348, 48];
const hueOf = (id: number) => HUES[Math.abs(id * 7 + 3) % HUES.length];
const DONE: string[] = ["Completed", "Rejected", "Cancelled"];

const cardTone = "bg-[hsl(var(--h)_70%_93%)] dark:bg-[hsl(var(--h)_26%_19%)]";

const parseDay = (v?: string | null) => (v ? new Date(`${String(v).slice(0, 10)}T00:00:00`) : null);
const shortDay = (v?: string | null) => parseDay(v)?.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) ?? "—";
const isOverdue = (t: ProjectTask) => {
  const d = parseDay(t.due_date);
  if (!d || DONE.includes(t.status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};
const initials = (a: { first_name?: string; last_name?: string }) => `${a.first_name?.[0] ?? ""}${a.last_name?.[0] ?? ""}`.toUpperCase() || "?";

/** Profile photos are stored as a full link (Drive etc.) or a storage path served by the API. */
function photoSrc(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")}/photos/${path.replaceAll("\\", "/")}`;
}

function Avatars({ task, size = 24 }: { task: ProjectTask; size?: number }) {
  const list = task.assignees || [];
  if (!list.length) {
    return <span className="text-[11px] italic text-slate-500 dark:text-slate-400">{task.old_assignee_name || "Unassigned"}</span>;
  }
  return (
    <span className="flex items-center -space-x-1.5">
      {list.slice(0, 3).map((a) => {
        const src = photoSrc(a.profile_photo_path);
        const box = { width: size, height: size, fontSize: size * 0.42 };
        return src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={a.id} src={src} alt={`${a.first_name} ${a.last_name}`} title={`${a.first_name} ${a.last_name}`} style={box} className="rounded-full border-2 border-white dark:border-slate-900 object-cover bg-slate-200" referrerPolicy="no-referrer" loading="lazy" />
        ) : (
          <span key={a.id} title={`${a.first_name} ${a.last_name}`} style={{ ["--h" as any]: hueOf(a.id + 5), ...box }} className="grid place-items-center rounded-full border-2 border-white dark:border-slate-900 font-bold text-white bg-[hsl(var(--h)_55%_42%)]">
            {initials(a)}
          </span>
        );
      })}
      {list.length > 3 && (
        <span style={{ width: size, height: size, fontSize: size * 0.4 }} className="grid place-items-center rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-200">
          +{list.length - 3}
        </span>
      )}
    </span>
  );
}

function CardBody({ task, busy }: { task: ProjectTask; busy?: boolean }) {
  const over = isOverdue(task);
  return (
    <>
      <div className="flex items-start gap-2">
        <h4 className="flex-1 text-[13.5px] font-semibold leading-snug text-slate-900 dark:text-slate-50 line-clamp-3">{task.title}</h4>
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-500" />
        ) : (
          <span
            title={`Priority: ${task.priority}`}
            aria-label={`Priority: ${task.priority}`}
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] || "#A1A1AA", boxShadow: `0 0 0 3px ${(PRIORITY_COLORS[task.priority] || "#A1A1AA")}33` }}
          />
        )}
      </div>
      {task.project?.name && <p className="mt-1 text-[11.5px] text-[hsl(var(--h)_35%_32%)] dark:text-[hsl(var(--h)_30%_72%)] truncate">{task.project.name}</p>}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
            over ? "bg-rose-600 text-white" : "bg-white/70 dark:bg-white/10 text-slate-700 dark:text-slate-200"
          }`}
        >
          <CalendarDays className="h-3 w-3" />
          {over ? "Overdue · " : ""}
          {shortDay(task.due_date)}
        </span>
        <Avatars task={task} />
      </div>
    </>
  );
}

/* ───────────────────────── Side panel ───────────────────────── */

function TaskDrawer({
  task, canEdit, onClose, onMove, onPriority, onEdit,
}: {
  task: ProjectTask; canEdit: boolean; onClose: () => void;
  onMove: (t: ProjectTask, s: TaskStatus) => void; onPriority: (t: ProjectTask, p: TaskPriority) => void; onEdit: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const pct = Math.max(0, Math.min(100, Number(task.activity_percentage) || 0));
  const row = "flex items-center justify-between gap-3 py-2.5 border-b border-slate-200/70 dark:border-slate-800 text-sm";
  return (
    <Portal>
      <div className="fixed inset-0 z-[9990]" style={{ ["--h" as any]: hueOf(task.id) }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/45" />
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label={`Task: ${task.title}`}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-0 top-0 bottom-0 w-full md:w-[460px] max-md:top-auto max-md:h-[90dvh] max-md:rounded-t-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
          style={{ transformOrigin: "bottom" }}
        >
          <div className="relative px-5 pt-5 pb-4 bg-[hsl(var(--h)_70%_92%)] dark:bg-[hsl(var(--h)_26%_20%)]">
            <span aria-hidden className="md:hidden absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-400/60" />
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[hsl(var(--h)_35%_30%)] dark:text-[hsl(var(--h)_30%_72%)] truncate">{task.project?.name || "No project"}{task.sub_phase?.name ? ` · ${task.sub_phase.name}` : ""}</p>
                <h2 className="mt-1 text-lg font-bold leading-snug text-slate-900 dark:text-white">{task.title}</h2>
              </div>
              <button ref={closeRef} onClick={onClose} aria-label="Close task panel" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            <div className={row}>
              <span className="text-slate-500">Status</span>
              {canEdit ? <TaskStatusSelect value={task.status} onChange={(v) => onMove(task, v as TaskStatus)} className="min-w-[170px]" /> : <span className="font-semibold">{task.status}</span>}
            </div>
            <div className={row}>
              <span className="text-slate-500">Priority</span>
              {canEdit ? <TaskPrioritySelect showLabel value={task.priority} onChange={(v) => onPriority(task, v as TaskPriority)} className="min-w-[140px]" /> : <span className="font-semibold">{task.priority}</span>}
            </div>
            <div className={row}><span className="text-slate-500">Start</span><span className="font-medium">{shortDay(task.start_date)}</span></div>
            <div className={row}>
              <span className="text-slate-500">Due</span>
              <span className={`font-medium ${isOverdue(task) ? "text-rose-600" : ""}`}>{shortDay(task.due_date)}{isOverdue(task) ? " · overdue" : ""}</span>
            </div>
            <div className={row}><span className="text-slate-500">Assigned to</span><Avatars task={task} size={28} /></div>
            {task.assignees && task.assignees.length > 0 && (
              <p className="py-2 text-xs text-slate-500">{task.assignees.map((a) => `${a.first_name} ${a.last_name}`).join(", ")}</p>
            )}
            <div className="py-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5"><span>Progress</span><span className="font-semibold text-slate-700 dark:text-slate-200">{pct}%</span></div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-[hsl(var(--h)_62%_46%)]" style={{ width: `${pct}%` }} /></div>
            </div>
            {task.description && (
              <div className="py-2">
                <p className="text-xs text-slate-500 mb-1">Description</p>
                <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}
            {task.current_updates && (
              <div className="py-2">
                <p className="text-xs text-slate-500 mb-1">Latest update</p>
                <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{task.current_updates}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {canEdit && (
              <button onClick={onEdit} className="flex-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#00806E] hover:bg-[#006B5C] px-4 text-sm font-semibold text-white">
                <Pencil className="h-4 w-4" /> Edit task
              </button>
            )}
            <Link href={`/project-management/tasks/${task.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 text-sm font-medium text-slate-800 dark:text-slate-100">
              <ExternalLink className="h-4 w-4" /> Full page
            </Link>
          </div>
        </motion.aside>
      </div>
    </Portal>
  );
}

/* ───────────────────────── Board ───────────────────────── */

type Drag = { task: ProjectTask; x: number; y: number; dx: number; dy: number; w: number; over: string };
/** Small move-earlier / move-later pair used while arranging. `row` = left/right arrows, otherwise up/down. */
export function ArrangeArrows({ onMove, canBack = true, canFwd = true, row = false, label, className = "" }: { onMove: (dir: -1 | 1) => void; canBack?: boolean; canFwd?: boolean; row?: boolean; label: string; className?: string }) {
  const b = "grid h-9 w-9 place-items-center rounded-lg bg-white/90 dark:bg-white/10 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-white disabled:opacity-30";
  return (
    <span className={`inline-flex gap-1 ${className}`} onClick={(e) => e.stopPropagation()}>
      <button type="button" disabled={!canBack} onClick={() => onMove(-1)} aria-label={`Move ${label} ${row ? "left" : "up"}`} className={b}>{row ? <ChevronLeft className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</button>
      <button type="button" disabled={!canFwd} onClick={() => onMove(1)} aria-label={`Move ${label} ${row ? "right" : "down"}`} className={b}>{row ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
    </span>
  );
}

const COL_KEY = "pm_board_columns";
function loadOrder(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(COL_KEY) || "[]");
    if (Array.isArray(saved)) {
      const known = saved.filter((x) => TASK_STATUSES.includes(x));
      return [...known, ...TASK_STATUSES.filter((x) => !known.includes(x))];
    }
  } catch { /* storage unavailable */ }
  return [...TASK_STATUSES];
}

export type BoardGroup = { key: string; name: string; sub?: string; tasks: ProjectTask[] };

export function TaskBoard({
  tasks, groups, canEdit, arrange = false, onMoveGroup, onMove, onPriority, onUpdated, updatingTaskId,
}: {
  tasks: ProjectTask[]; groups?: BoardGroup[]; canEdit: boolean; arrange?: boolean; onMoveGroup?: (key: string, dir: -1 | 1) => void;
  onMove: (t: ProjectTask, s: TaskStatus) => void; onPriority: (t: ProjectTask, p: TaskPriority) => void;
  onUpdated: (t: ProjectTask) => void; updatingTaskId: number | null;
}) {
  const [by, setBy] = useState<"status" | "person">("status");
  const [order, setOrder] = useState<string[]>([...TASK_STATUSES]);
  useEffect(() => setOrder(loadOrder()), []);
  const saveOrder = (o: string[]) => {
    setOrder(o);
    try { localStorage.setItem(COL_KEY, JSON.stringify(o)); } catch { /* storage unavailable */ }
  };
  const moveLane = (s: string, dir: -1 | 1) => {
    const i = order.indexOf(s), j = i + dir;
    if (j < 0 || j >= order.length) return;
    const o = [...order];
    [o[i], o[j]] = [o[j], o[i]];
    saveOrder(o);
  };
  const [drag, setDrag] = useState<Drag | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  // Only lanes the user toggled are stored; every other lane is open when it has tasks, folded when empty.
  const [fold, setFold] = useState<Record<string, boolean>>({});
  const gesture = useRef<{ t: ProjectTask; sx: number; sy: number; touch: boolean; active: boolean; timer?: number } | null>(null);
  const edgeY = useRef(0);
  const justDragged = useRef(false);
  const latest = useRef({ onMove });
  latest.current.onMove = onMove;

  const allTasks = useMemo(() => (groups ? groups.flatMap((g) => g.tasks) : tasks), [groups, tasks]);
  const open = allTasks.find((t) => t.id === openId) || null;
  const stopTouchScroll = useCallback((e: TouchEvent) => e.cancelable && e.preventDefault(), []);

  const finish = useCallback(() => {
    const g = gesture.current;
    if (g?.timer) window.clearTimeout(g.timer);
    window.removeEventListener("touchmove", stopTouchScroll);
    document.body.style.userSelect = "";
    edgeY.current = 0;
    gesture.current = null;
    setDrag(null);
  }, [stopTouchScroll]);

  useEffect(() => {
    if (!drag) return;
    let raf = 0;
    const tick = () => {
      if (edgeY.current) window.scrollBy(0, edgeY.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [!!drag]); // eslint-disable-line react-hooks/exhaustive-deps

  const laneAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest("[data-lane]") as HTMLElement | null;
    return el?.dataset.lane?.split("|")[1] || "";
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>, t: ProjectTask) => {
    if (!canEdit || (e.pointerType === "mouse" && e.button !== 0)) return;
    const touch = e.pointerType !== "mouse";
    const card = e.currentTarget;
    const g = { t, sx: e.clientX, sy: e.clientY, touch, active: false } as NonNullable<typeof gesture.current>;
    gesture.current = g;

    const activate = (x: number, y: number) => {
      g.active = true;
      const r = card.getBoundingClientRect();
      document.body.style.userSelect = "none";
      if (touch) {
        window.addEventListener("touchmove", stopTouchScroll, { passive: false });
        try { navigator.vibrate?.(12); } catch { /* not supported */ }
      }
      setDrag({ task: t, x, y, dx: x - r.left, dy: y - r.top, w: r.width, over: t.status });
    };
    if (touch) g.timer = window.setTimeout(() => activate(g.sx, g.sy), 260);

    const move = (ev: PointerEvent) => {
      if (!g.active) {
        const dist = Math.hypot(ev.clientX - g.sx, ev.clientY - g.sy);
        if (touch && dist > 9) return cleanup();
        if (!touch && dist > 5) activate(ev.clientX, ev.clientY);
        return;
      }
      edgeY.current = ev.clientY < 90 ? -12 : ev.clientY > window.innerHeight - 90 ? 12 : 0;
      setDrag((d) => (d ? { ...d, x: ev.clientX, y: ev.clientY, over: laneAt(ev.clientX, ev.clientY) } : d));
    };
    const up = (ev: PointerEvent) => {
      if (g.active) {
        justDragged.current = true;
        setTimeout(() => (justDragged.current = false), 0);
        const to = laneAt(ev.clientX, ev.clientY);
        if (to && to !== g.t.status) latest.current.onMove(g.t, to as TaskStatus);
      }
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cleanup);
      finish();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cleanup);
  };

  /** One set of status lanes. Desktop: one row where folded lanes shrink to a slim rail, so nothing scrolls sideways. Phone/tablet: a stack of folding sections. */
  const renderLanes = (list: ProjectTask[], gid: string) => {
    const buckets = new Map<string, ProjectTask[]>();
    order.forEach((s) => buckets.set(s, []));
    list.forEach((t) => (buckets.get(t.status) ?? buckets.set(t.status, []).get(t.status)!).push(t));
    return (
      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
        {Array.from(buckets.keys()).map((s) => {
          const items = buckets.get(s)!;
          const key = `${gid}|${s}`;
          const folded = fold[key] ?? items.length === 0;
          const color = STATUS_COLORS[s] || "#A1A1AA";
          const hot = drag?.over === s && drag.task.status !== s;
          return (
            <section
              key={key}
              data-lane={key}
              aria-label={`${s}, ${items.length} tasks`}
              className={`rounded-2xl bg-stone-100 dark:bg-slate-900/70 transition-all duration-200 ${folded ? (arrange ? "lg:w-[5.25rem]" : "lg:w-12") + " lg:shrink-0" : "lg:flex-1 lg:min-w-[210px]"}`}
              style={hot ? { backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, boxShadow: `inset 0 0 0 2px ${color}` } : undefined}
            >
              {arrange && (
                <div className={`flex ${folded ? "lg:justify-center" : "justify-end"} px-2 pt-2`}>
                  <ArrangeArrows label={s} row={false} className="lg:hidden" canBack={order.indexOf(s) > 0} canFwd={order.indexOf(s) < order.length - 1} onMove={(d) => moveLane(s, d)} />
                  <ArrangeArrows label={s} row className="max-lg:hidden" canBack={order.indexOf(s) > 0} canFwd={order.indexOf(s) < order.length - 1} onMove={(d) => moveLane(s, d)} />
                </div>
              )}
              <button
                type="button"
                onClick={() => setFold((f) => ({ ...f, [key]: !folded }))}
                aria-expanded={!folded}
                className={`flex w-full items-center gap-2.5 px-3.5 min-h-12 text-left ${folded ? "lg:h-full lg:min-h-[9rem] lg:flex-col lg:justify-start lg:px-0 lg:pt-3.5" : ""}`}
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className={`flex-1 text-[13px] font-bold text-slate-800 dark:text-slate-100 ${folded ? "lg:flex-none lg:[writing-mode:vertical-rl] lg:rotate-180 lg:order-3" : ""}`}>{s}</span>
                <span className={`rounded-full bg-white/80 dark:bg-white/10 px-2 text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300 ${folded ? "lg:order-2" : ""}`}>{items.length}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${folded ? "-rotate-90 lg:hidden" : ""}`} />
              </button>
              {!folded && (
                <div className="space-y-2.5 px-2.5 pb-3">
                  {items.map((t) => (
                    <article
                      key={t.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`${t.title}. Open details`}
                      onPointerDown={(e) => onPointerDown(e, t)}
                      onClick={() => !justDragged.current && setOpenId(t.id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpenId(t.id))}
                      onContextMenu={(e) => { if (gesture.current?.touch) e.preventDefault(); }}
                      style={{ ["--h" as any]: hueOf(t.id), WebkitTouchCallout: "none" }}
                      className={`relative select-none rounded-2xl px-3.5 py-3 shadow-[0_1px_2px_rgba(30,20,10,0.08)] outline-none transition-[transform,box-shadow,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-[#00806E] hover:-translate-y-0.5 hover:shadow-md ${cardTone} ${canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${drag?.task.id === t.id ? "opacity-30" : ""}`}
                    >
                      <CardBody task={t} busy={updatingTaskId === t.id} />
                    </article>
                  ))}
                  {items.length === 0 && (
                    <p className="grid h-16 place-items-center rounded-xl text-xs text-stone-500 dark:text-slate-500">{canEdit ? "Drop a task here" : "Nothing here"}</p>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  };

  const showPeople = by === "person" && groups;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {groups ? (
          <div className="inline-flex rounded-xl bg-stone-100 dark:bg-slate-800 p-1" role="group" aria-label="Group board by">
            {([["status", "By status", Rows3], ["person", "By employee", Users]] as const).map(([v, label, Icon]) => (
              <button
                key={v}
                onClick={() => setBy(v)}
                aria-pressed={by === v}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${by === v ? "bg-white dark:bg-slate-900 text-[#00806E] shadow-sm" : "text-slate-600 dark:text-slate-300"}`}
              >
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>
        ) : <span />}
        {arrange && by === "status" && (
          <button type="button" onClick={() => saveOrder([...TASK_STATUSES])} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800">
            <RotateCcw className="h-3.5 w-3.5" /> Reset column order
          </button>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {canEdit ? "Drag a card to change its status (touch: press and hold). " : ""}Tap a status name to fold it.
        </p>
      </div>

      {showPeople ? (
        <div className="space-y-4">
          {groups!.map((g, gi) => {
            const gkey = `p:${g.key}`;
            const closed = fold[gkey] ?? false;
            return (
              <div key={g.key} className="rounded-3xl bg-white/70 dark:bg-slate-900/50 p-2 sm:p-3 shadow-sm">
                <div className="flex items-center gap-1">
                {arrange && onMoveGroup && g.key.startsWith("u") && (
                  <ArrangeArrows label={g.name} canBack={gi > 0} canFwd={gi < groups!.length - 1} onMove={(d) => onMoveGroup(g.key, d)} />
                )}
                <button onClick={() => setFold((f) => ({ ...f, [gkey]: !closed }))} aria-expanded={!closed} className="flex flex-1 items-center gap-3 px-2 py-1.5 min-h-12 text-left">
                  <span style={{ ["--h" as any]: hueOf(g.key.length * 31 + g.name.charCodeAt(0)) }} className="grid h-9 w-9 place-items-center rounded-full bg-[hsl(var(--h)_55%_42%)] text-sm font-bold text-white">{g.name[0]?.toUpperCase()}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{g.name}</span>
                    {g.sub && <span className="block truncate text-xs text-slate-500">{g.sub}</span>}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{g.tasks.length} {g.tasks.length === 1 ? "task" : "tasks"}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${closed ? "-rotate-90" : ""}`} />
                </button>
                </div>
                {!closed && <div className="mt-2">{renderLanes(g.tasks, g.key)}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        renderLanes(allTasks, "all")
      )}

      {drag && (
        <Portal>
          <div
            aria-hidden
            className={`pointer-events-none fixed z-[100000] rounded-2xl px-3.5 py-3 shadow-2xl ${cardTone}`}
            style={{ ["--h" as any]: hueOf(drag.task.id), left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.w, transform: "rotate(2.5deg) scale(1.03)" }}
          >
            <CardBody task={drag.task} />
          </div>
        </Portal>
      )}

      <AnimatePresence>
        {open && (
          <TaskDrawer key={open.id} task={open} canEdit={canEdit} onClose={() => setOpenId(null)} onMove={onMove} onPriority={onPriority} onEdit={() => setEditing(true)} />
        )}
      </AnimatePresence>
      {open && editing && <EditTaskModal isOpen task={open} onClose={() => setEditing(false)} onSuccess={(t) => onUpdated(t)} />}
    </div>
  );
}
