"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ExternalLink, Loader2, Pencil, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { ProjectTask, TaskPriority, TaskStatus, TASK_STATUSES } from "@/types/pm";
import { PRIORITY_COLORS, STATUS_COLORS, TaskPrioritySelect, TaskStatusSelect } from "@/components/project-management/priorityPalette";
import { EditTaskModal } from "@/components/project-management/EditTaskModal";

/* Every task gets its own hue from its id, so neighbouring cards never share a colour. */
const HUES = [162, 8, 36, 204, 262, 332, 92, 188, 22, 292, 348, 48];
const hueOf = (id: number) => HUES[Math.abs(id * 7 + 3) % HUES.length];
const DONE: string[] = ["Completed", "Rejected", "Cancelled"];

const cardTone =
  "bg-[hsl(var(--h)_62%_95%)] border-[hsl(var(--h)_45%_84%)] dark:bg-[hsl(var(--h)_28%_17%)] dark:border-[hsl(var(--h)_30%_28%)]";

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

function Avatars({ task, size = 24 }: { task: ProjectTask; size?: number }) {
  const list = task.assignees || [];
  if (!list.length) {
    return <span className="text-[11px] italic text-slate-500 dark:text-slate-400">{task.old_assignee_name || "Unassigned"}</span>;
  }
  return (
    <span className="flex items-center -space-x-1.5">
      {list.slice(0, 3).map((a) => (
        <span
          key={a.id}
          title={`${a.first_name} ${a.last_name}`}
          style={{ ["--h" as any]: hueOf(a.id + 5), width: size, height: size, fontSize: size * 0.42 }}
          className="grid place-items-center rounded-full border-2 border-white dark:border-slate-900 font-bold text-white bg-[hsl(var(--h)_55%_42%)]"
        >
          {initials(a)}
        </span>
      ))}
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
      <span aria-hidden className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-[hsl(var(--h)_62%_46%)]" />
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
          <div className="relative px-5 pt-5 pb-4 bg-[hsl(var(--h)_62%_93%)] dark:bg-[hsl(var(--h)_28%_18%)] border-b border-[hsl(var(--h)_45%_82%)] dark:border-[hsl(var(--h)_30%_28%)]">
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

export function TaskBoard({
  tasks, canEdit, onMove, onPriority, onUpdated, updatingTaskId,
}: {
  tasks: ProjectTask[]; canEdit: boolean;
  onMove: (t: ProjectTask, s: TaskStatus) => void; onPriority: (t: ProjectTask, p: TaskPriority) => void;
  onUpdated: (t: ProjectTask) => void; updatingTaskId: number | null;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [lane, setLane] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ t: ProjectTask; sx: number; sy: number; touch: boolean; active: boolean; timer?: number; card: HTMLElement } | null>(null);
  const edge = useRef({ x: 0, y: 0 });
  const justDragged = useRef(false);
  const latest = useRef({ onMove });
  latest.current.onMove = onMove;

  const byStatus = useMemo(() => {
    const m = new Map<string, ProjectTask[]>();
    TASK_STATUSES.forEach((s) => m.set(s, []));
    tasks.forEach((t) => (m.get(t.status) ?? m.set(t.status, []).get(t.status)!).push(t));
    return m;
  }, [tasks]);
  const open = tasks.find((t) => t.id === openId) || null;

  const stopTouchScroll = useCallback((e: TouchEvent) => e.cancelable && e.preventDefault(), []);

  const finish = useCallback(() => {
    const g = gesture.current;
    if (g?.timer) window.clearTimeout(g.timer);
    window.removeEventListener("touchmove", stopTouchScroll);
    document.body.style.userSelect = "";
    edge.current = { x: 0, y: 0 };
    gesture.current = null;
    setDrag(null);
  }, [stopTouchScroll]);

  // Edge auto-scroll while a card is held near the sides / top / bottom of the screen.
  useEffect(() => {
    if (!drag) return;
    let raf = 0;
    const tick = () => {
      if (edge.current.x && scroller.current) scroller.current.scrollLeft += edge.current.x;
      if (edge.current.y) window.scrollBy(0, edge.current.y);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [!!drag]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (e: React.PointerEvent<HTMLElement>, t: ProjectTask) => {
    if (!canEdit || (e.pointerType === "mouse" && e.button !== 0)) return;
    const touch = e.pointerType !== "mouse";
    const card = e.currentTarget;
    const g = { t, sx: e.clientX, sy: e.clientY, touch, active: false, card } as NonNullable<typeof gesture.current>;
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
        if (touch && dist > 9) return cleanup(); // finger is scrolling, not dragging
        if (!touch && dist > 5) activate(ev.clientX, ev.clientY);
        return;
      }
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-lane]") as HTMLElement | null;
      const sc = scroller.current?.getBoundingClientRect();
      edge.current = {
        x: sc ? (ev.clientX < sc.left + 56 ? -14 : ev.clientX > sc.right - 56 ? 14 : 0) : 0,
        y: ev.clientY < 90 ? -12 : ev.clientY > window.innerHeight - 90 ? 12 : 0,
      };
      setDrag((d) => (d ? { ...d, x: ev.clientX, y: ev.clientY, over: el?.dataset.lane || "" } : d));
    };
    const up = (ev: PointerEvent) => {
      if (g.active) {
        justDragged.current = true;
        setTimeout(() => (justDragged.current = false), 0);
        const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-lane]") as HTMLElement | null;
        const to = el?.dataset.lane;
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

  const jump = (i: number) => {
    const el = scroller.current?.querySelectorAll<HTMLElement>("[data-lane]")[i];
    el?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };
  const onScroll = () => {
    const sc = scroller.current;
    if (!sc) return;
    const lanes = Array.from(sc.querySelectorAll<HTMLElement>("[data-lane]"));
    const left = sc.getBoundingClientRect().left;
    let best = 0, bd = Infinity;
    lanes.forEach((l, i) => { const d = Math.abs(l.getBoundingClientRect().left - left); if (d < bd) { bd = d; best = i; } });
    setLane(best);
  };

  return (
    <div className="space-y-3">
      {/* Phone / tablet: jump strip */}
      <div className="lg:hidden -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none" role="tablist" aria-label="Jump to status">
        {TASK_STATUSES.map((s, i) => (
          <button
            key={s}
            role="tab"
            aria-selected={lane === i}
            onClick={() => jump(i)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors ${
              lane === i ? "text-white border-transparent" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
            }`}
            style={lane === i ? { backgroundColor: STATUS_COLORS[s] } : undefined}
          >
            {s}
            <span className={`rounded-full px-1.5 text-[11px] ${lane === i ? "bg-white/25" : "bg-slate-100 dark:bg-slate-800"}`}>{byStatus.get(s)?.length ?? 0}</span>
          </button>
        ))}
      </div>

      <div
        ref={scroller}
        onScroll={onScroll}
        className={`-mx-4 sm:-mx-1 flex gap-3 overflow-x-auto px-4 sm:px-1 pb-4 items-start ${drag ? "" : "snap-x snap-mandatory lg:snap-none"}`}
      >
        {TASK_STATUSES.map((s) => {
          const list = byStatus.get(s) || [];
          const color = STATUS_COLORS[s] || "#A1A1AA";
          const over = drag?.over === s && drag.task.status !== s;
          return (
            <section
              key={s}
              data-lane={s}
              aria-label={`${s}, ${list.length} tasks`}
              className="snap-start shrink-0 w-[84vw] sm:w-[calc(50%-0.375rem)] md:w-[calc(33.333%-0.5rem)] lg:w-[288px] rounded-2xl bg-stone-100/90 dark:bg-slate-900/70 border border-stone-200 dark:border-slate-800 transition-[background-color,outline-color] duration-150"
              style={{ borderTop: `4px solid ${color}`, outline: over ? `2px dashed ${color}` : "2px dashed transparent", outlineOffset: -2, backgroundColor: over ? `color-mix(in srgb, ${color} 12%, transparent)` : undefined }}
            >
              <header className="flex items-center justify-between px-3.5 pt-3 pb-2">
                <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{s}</h3>
                <span className="min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-bold text-white" style={{ backgroundColor: color }}>{list.length}</span>
              </header>
              <div className="space-y-2.5 px-2.5 pb-3 min-h-24">
                {list.map((t, i) => (
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
                    className={`relative select-none rounded-xl border pl-4 pr-3 py-3 shadow-[0_1px_0_rgba(0,0,0,0.04)] outline-none transition-[transform,box-shadow,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-[#00806E] hover:-translate-y-0.5 hover:shadow-md ${cardTone} ${canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${drag?.task.id === t.id ? "opacity-30" : ""}`}
                  >
                    <CardBody task={t} busy={updatingTaskId === t.id} />
                  </article>
                ))}
                {list.length === 0 && (
                  <div className="grid h-20 place-items-center rounded-xl border-2 border-dashed border-stone-300 dark:border-slate-700 text-xs text-stone-500 dark:text-slate-500">
                    {canEdit ? "Drop a task here" : "Nothing here"}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {canEdit && <p className="text-xs text-slate-500 dark:text-slate-400 lg:hidden">Tip: press and hold a card, then drag it to another status.</p>}

      {drag && (
        <Portal>
          <div
            aria-hidden
            className={`pointer-events-none fixed z-[100000] rounded-xl border pl-4 pr-3 py-3 shadow-2xl ${cardTone}`}
            style={{ ["--h" as any]: hueOf(drag.task.id), left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.w, transform: "rotate(2.5deg) scale(1.03)" }}
          >
            <CardBody task={drag.task} />
          </div>
        </Portal>
      )}

      <AnimatePresence>
        {open && (
          <TaskDrawer
            key={open.id}
            task={open}
            canEdit={canEdit}
            onClose={() => setOpenId(null)}
            onMove={onMove}
            onPriority={onPriority}
            onEdit={() => setEditing(true)}
          />
        )}
      </AnimatePresence>
      {open && editing && (
        <EditTaskModal isOpen task={open} onClose={() => setEditing(false)} onSuccess={(t) => { onUpdated(t); }} />
      )}
    </div>
  );
}
