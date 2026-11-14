"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, Maximize2, RotateCcw, X } from "lucide-react";

export interface HallEmployee {
  id: number;
  first_name: string;
  last_name: string;
  employee_code: string;
  designation?: string | null;
  team: string;
  status: string;
}

type Kind = "working" | "wfh" | "leave" | "holiday";

/** Maps the existing /hall status string to a chair kind. No status is invented here. */
export function kindOf(status: string): { kind: Kind; half: boolean } {
  const half = status.includes("Half Day");
  if (status === "Holiday") return { kind: "holiday", half };
  if (status.includes("WFH")) return { kind: "wfh", half };
  if (status === "Working" || status === "Half Day Leave") return { kind: "working", half };
  return { kind: "leave", half };
}

const CHAIR = { working: "#16a34a", wfh: "#2563eb", leave: "#16a34a", holiday: "#94a3b8" } as const;

// Layout constants (px in floor-plan space). Layout is generated from data, not hardcoded.
const CELL_W = 76;
const CELL_H = 92;
const ZONE_PAD = 24;
const ZONE_HEAD = 40;
const GAP = 44;
const HALL_PAD = 56;
const MAX_ROW_W = 1500;

interface Seat { emp: HallEmployee; x: number; y: number }
interface Zone { name: string; x: number; y: number; w: number; h: number; seats: Seat[] }

function buildLayout(employees: HallEmployee[]) {
  const byTeam = new Map<string, HallEmployee[]>();
  for (const e of employees) {
    const list = byTeam.get(e.team) ?? [];
    list.push(e);
    byTeam.set(e.team, list);
  }
  const teams = [...byTeam.entries()]
    .map(([name, emps]) => ({ name, emps: [...emps].sort((a, b) => a.first_name.localeCompare(b.first_name)) }))
    // Unassigned last, otherwise biggest team first
    .sort((a, b) => (a.name === "Unassigned" ? 1 : b.name === "Unassigned" ? -1 : b.emps.length - a.emps.length));

  const zones: Zone[] = [];
  let cx = HALL_PAD, cy = HALL_PAD + 20, rowH = 0, maxX = 0;
  for (const t of teams) {
    const cols = Math.min(t.emps.length, Math.max(2, Math.ceil(Math.sqrt(t.emps.length * 1.5))));
    const rows = Math.ceil(t.emps.length / cols);
    const w = cols * CELL_W + ZONE_PAD * 2;
    const h = rows * CELL_H + ZONE_PAD * 2 + ZONE_HEAD;
    if (cx > HALL_PAD && cx + w > MAX_ROW_W) { cx = HALL_PAD; cy += rowH + GAP; rowH = 0; }
    const seats = t.emps.map((emp, i) => ({
      emp,
      x: cx + ZONE_PAD + (i % cols) * CELL_W,
      y: cy + ZONE_HEAD + ZONE_PAD + Math.floor(i / cols) * CELL_H,
    }));
    zones.push({ name: t.name, x: cx, y: cy, w, h, seats });
    cx += w + GAP;
    rowH = Math.max(rowH, h);
    maxX = Math.max(maxX, cx - GAP);
  }
  return { zones, w: Math.max(maxX + HALL_PAD, 600), h: cy + rowH + HALL_PAD + 40 };
}

const initials = (e: HallEmployee) => `${e.first_name[0] ?? ""}${e.last_name[0] ?? ""}`.toUpperCase();

interface DeskProps {
  seat: Seat;
  dimmed: boolean;
  selected: boolean;
  showName: boolean;
  onHover: (emp: HallEmployee | null, e?: React.PointerEvent) => void;
  onPick: (emp: HallEmployee) => void;
}

const Desk = memo(function Desk({ seat, dimmed, selected, showName, onHover, onPick }: DeskProps) {
  const { emp, x, y } = seat;
  const { kind, half } = kindOf(emp.status);
  const color = CHAIR[kind];
  const away = kind === "leave";
  return (
    <g
      transform={`translate(${x},${y})`}
      opacity={dimmed ? 0.18 : 1}
      className="cursor-pointer outline-none"
      role="button"
      tabIndex={dimmed ? -1 : 0}
      aria-label={`${emp.first_name} ${emp.last_name}, ${emp.status}`}
      onPointerEnter={(e) => onHover(emp, e)}
      onPointerMove={(e) => onHover(emp, e)}
      onPointerLeave={() => onHover(null)}
      onClick={() => onPick(emp)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(emp); } }}
    >
      {/* full-cell hit area: no gaps between desk, chair and name, so hover never flickers */}
      <rect x={0} y={0} width={CELL_W} height={CELL_H - 4} fill="transparent" />
      {/* desk */}
      <rect x={8} y={6} width={60} height={28} rx={3} className="fill-white stroke-slate-300 dark:fill-slate-700 dark:stroke-slate-500" strokeWidth={1} />
      <rect x={8} y={9} width={60} height={28} rx={3} className="fill-slate-200/70 dark:fill-slate-900/50" style={{ transform: "translateY(3px)" }} opacity={0.5} />
      {/* monitor + keyboard */}
      <rect x={28} y={10} width={20} height={3} rx={1} className="fill-slate-700 dark:fill-slate-300" />
      <rect x={30} y={21} width={16} height={6} rx={1.5} className="fill-slate-300 dark:fill-slate-500" />
      {/* chair */}
      <ellipse cx={38} cy={64} rx={15} ry={4} className="fill-black/10" />
      <circle
        cx={38} cy={52} r={14}
        fill={away ? "none" : color}
        fillOpacity={1}
        stroke={color}
        strokeWidth={away ? 2.5 : 1.5}
        strokeDasharray={away ? "4 3" : undefined}
      />
      {away && <circle cx={38} cy={52} r={14} fill={color} fillOpacity={0.18} />}
      <text x={38} y={56} textAnchor="middle" fontSize={11} fontWeight={700} fill={away ? color : "#fff"} style={{ pointerEvents: "none" }}>
        {initials(emp)}
      </text>
      {/* distinguishing indicators */}
      {away && (
        <g style={{ pointerEvents: "none" }}>
          <circle cx={51} cy={41} r={6} fill="#dc2626" stroke="#fff" strokeWidth={1.2} />
          <path d="M48.5 38.5l5 5M53.5 38.5l-5 5" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      )}
      {half && (
        <g style={{ pointerEvents: "none" }}>
          <circle cx={51} cy={41} r={6} fill="#f97316" stroke="#fff" strokeWidth={1.2} />
          <path d="M51 35a6 6 0 0 1 0 12z" fill="#fff" opacity={0.9} />
        </g>
      )}
      {selected && <circle cx={38} cy={52} r={19} fill="none" stroke="#0f172a" strokeWidth={2} className="dark:stroke-white" />}
      {showName && (
        <text x={38} y={82} textAnchor="middle" fontSize={10} className="fill-slate-600 dark:fill-slate-300" style={{ pointerEvents: "none" }}>
          {emp.first_name.length > 11 ? emp.first_name.slice(0, 10) + "…" : emp.first_name}
        </text>
      )}
    </g>
  );
});

interface Props {
  employees: HallEmployee[];
  /** ids that pass the page's search/team/status filters; others are dimmed */
  visibleIds: Set<number>;
  selectedTeam: string | null;
  onSelectTeam: (team: string | null) => void;
  updatedAt: Date;
  holidayName?: string | null;
}

export default function HallFloor({ employees, visibleIds, selectedTeam, onSelectTeam, updatedAt, holidayName }: Props) {
  const layout = useMemo(() => buildLayout(employees), [employees]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tf, setTf] = useState({ x: 0, y: 0, k: 1 });
  const [animate, setAnimate] = useState(false);
  const [hover, setHover] = useState<{ emp: HallEmployee; x: number; y: number } | null>(null);
  const [picked, setPicked] = useState<HallEmployee | null>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fitBox = useCallback((bx: number, by: number, bw: number, bh: number, anim = true) => {
    if (!size.w || !size.h) return;
    const k = Math.min(size.w / bw, size.h / bh, 2.2) * 0.94;
    setAnimate(anim);
    setTf({ k, x: (size.w - bw * k) / 2 - bx * k, y: (size.h - bh * k) / 2 - by * k });
  }, [size]);

  const fitAll = useCallback((anim = true) => fitBox(0, 0, layout.w, layout.h, anim), [fitBox, layout]);

  // Refit when the layout (data) or container size changes.
  useEffect(() => { fitAll(false); }, [layout, size.w, size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  // Zoom to the selected team, or back to the whole hall.
  useEffect(() => {
    if (!selectedTeam) { fitAll(); return; }
    const z = layout.zones.find((zz) => zz.name === selectedTeam);
    if (z) fitBox(z.x - 30, z.y - 30, z.w + 60, z.h + 60);
  }, [selectedTeam]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setAnimate(false);
    setTf((t) => {
      const k = Math.min(4, Math.max(0.2, t.k * factor));
      const f = k / t.k;
      return { k, x: cx - (cx - t.x) * f, y: cy - (cy - t.y) * f };
    });
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: tf.x, oy: tf.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 4) {
      d.moved = true;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      setHover(null);
    }
    if (d.moved) { setAnimate(false); setTf((t) => ({ ...t, x: d.ox + dx, y: d.oy + dy })); }
  };
  const onPointerUp = () => { drag.current = null; };

  const onHover = useCallback((emp: HallEmployee | null, e?: React.PointerEvent) => {
    if (!emp || !e || drag.current?.moved) { setHover(null); return; }
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) setHover({ emp, x: e.clientX - r.left, y: e.clientY - r.top });
  }, []);
  const onPick = useCallback((emp: HallEmployee) => setPicked(emp), []);

  const zoomBtn = (f: number) => zoomAt(f, size.w / 2, size.h / 2);
  const showNames = tf.k >= 1.1;

  // Per-team and overall counts, from the same statuses the cards use.
  const stats = useMemo(() => layout.zones.map((z) => {
    let present = 0, wfh = 0, leave = 0, holiday = 0;
    for (const s of z.seats) {
      const { kind } = kindOf(s.emp.status);
      if (kind === "working") present++; else if (kind === "wfh") wfh++; else if (kind === "leave") leave++; else holiday++;
    }
    return { name: z.name, total: z.seats.length, present, wfh, leave, holiday };
  }), [layout]);
  const totals = stats.reduce((a, s) => ({ wfh: a.wfh + s.wfh, leave: a.leave + s.leave, seats: a.seats + s.total }), { wfh: 0, leave: 0, seats: 0 });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="relative">
        <div
          ref={wrapRef}
          className="relative h-[520px] lg:h-[640px] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-900 select-none"
          style={{ touchAction: "none", cursor: drag.current?.moved ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <svg width="100%" height="100%" role="group" aria-label="Office hall floor plan">
            <defs>
              <pattern id="hall-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M40 0H0V40" fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth={1} />
              </pattern>
              <filter id="hall-shadow" x="-5%" y="-5%" width="110%" height="115%">
                <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.14" />
              </filter>
            </defs>
            <g style={{ transform: `translate(${tf.x}px,${tf.y}px) scale(${tf.k})`, transformOrigin: "0 0", transition: animate ? "transform .35s ease" : "none" }}>
              {/* floor + walls */}
              <rect x={0} y={0} width={layout.w} height={layout.h} rx={14} className="fill-white dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500" strokeWidth={6} filter="url(#hall-shadow)" />
              <rect x={3} y={3} width={layout.w - 6} height={layout.h - 6} rx={12} fill="url(#hall-grid)" />
              {/* entrance (provisional) */}
              <rect x={layout.w / 2 - 70} y={layout.h - 5} width={140} height={10} className="fill-slate-100 dark:fill-slate-900" />
              <text x={layout.w / 2} y={layout.h - 14} textAnchor="middle" fontSize={11} className="fill-slate-400">ENTRANCE</text>

              {layout.zones.map((z) => {
                const active = selectedTeam === z.name;
                const faded = selectedTeam !== null && !active;
                return (
                  <g key={z.name} opacity={faded ? 0.35 : 1} style={{ transition: "opacity .25s" }}>
                    <rect
                      x={z.x} y={z.y} width={z.w} height={z.h} rx={10}
                      className={active ? "fill-sky-50 dark:fill-sky-950/40 stroke-sky-500" : "fill-slate-50 dark:fill-slate-700/30 stroke-slate-300 dark:stroke-slate-600"}
                      strokeWidth={active ? 2.5 : 1.5}
                    />
                    <g
                      className="cursor-pointer"
                      onClick={() => onSelectTeam(active ? null : z.name)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${active ? "Deselect" : "Select"} team ${z.name}`}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectTeam(active ? null : z.name); } }}
                    >
                      <text x={z.x + ZONE_PAD} y={z.y + 26} fontSize={15} fontWeight={700} className="fill-slate-800 dark:fill-slate-100">{z.name}</text>
                      <text x={z.x + z.w - ZONE_PAD} y={z.y + 26} textAnchor="end" fontSize={11} className="fill-slate-500 dark:fill-slate-400">
                        {stats.find((s) => s.name === z.name)?.total} seats
                      </text>
                    </g>
                    {z.seats.map((s) => (
                      <Desk
                        key={s.emp.id}
                        seat={s}
                        dimmed={!visibleIds.has(s.emp.id)}
                        selected={picked?.id === s.emp.id}
                        showName={showNames}
                        onHover={onHover}
                        onPick={onPick}
                      />
                    ))}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* camera controls */}
          <div className="absolute right-3 top-3 flex flex-col gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
            {[
              { label: "Zoom in", icon: <Plus className="h-4 w-4" />, fn: () => zoomBtn(1.3) },
              { label: "Zoom out", icon: <Minus className="h-4 w-4" />, fn: () => zoomBtn(1 / 1.3) },
              { label: "Fit entire office", icon: <Maximize2 className="h-4 w-4" />, fn: () => { onSelectTeam(null); fitAll(); } },
              { label: "Reset view", icon: <RotateCcw className="h-4 w-4" />, fn: () => { onSelectTeam(null); fitAll(); } },
            ].map((b) => (
              <button key={b.label} type="button" title={b.label} aria-label={b.label} onClick={b.fn}
                className="h-8 w-8 grid place-items-center rounded-lg bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                {b.icon}
              </button>
            ))}
          </div>

          {/* legend */}
          <div className="absolute left-3 bottom-3 rounded-lg bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-600 shadow-sm px-3 py-2 text-[11px] text-slate-700 dark:text-slate-200 space-y-1" onPointerDown={(e) => e.stopPropagation()}>
            <div className="font-semibold text-slate-900 dark:text-white">Legend</div>
            <Legend swatch={<span className="h-3 w-3 rounded-full" style={{ background: CHAIR.working }} />} text="Working / Present" />
            <Legend swatch={<span className="h-3 w-3 rounded-full" style={{ background: CHAIR.wfh }} />} text="Work from home" />
            <Legend swatch={<span className="relative h-3 w-3 rounded-full border-2 border-dashed" style={{ borderColor: CHAIR.leave, background: "#16a34a2e" }}><span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-red-600" /></span>} text="On leave / absent (hollow chair + red mark)" />
            <Legend swatch={<span className="h-3 w-3 rounded-full bg-orange-500" />} text="Half day (orange mark)" />
            {holidayName && <Legend swatch={<span className="h-3 w-3 rounded-full" style={{ background: CHAIR.holiday }} />} text="Holiday" />}
          </div>

          {hover && (
            <div
              className="pointer-events-none absolute z-10 rounded-lg bg-slate-900 text-white text-xs px-3 py-2 shadow-lg"
              style={{ left: Math.min(hover.x + 14, Math.max(0, size.w - 190)), top: Math.max(hover.y - 58, 4) }}
            >
              <div className="font-semibold">{hover.emp.first_name} {hover.emp.last_name}</div>
              <div className="text-slate-300">{hover.emp.team} · {hover.emp.status}</div>
            </div>
          )}

          {employees.length === 0 && (
            <div className="absolute inset-0 grid place-items-center text-sm text-slate-500">No employees to seat.</div>
          )}
        </div>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Provisional layout: seats are generated automatically from teams. Actual desk positions can be set once the real seating plan is provided. Drag to pan, scroll or use the buttons to zoom.
        </p>
      </div>

      {/* info panel */}
      <aside className="space-y-3">
        {picked && (() => {
          const live = employees.find((e) => e.id === picked.id) ?? picked;
          return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white" style={{ background: CHAIR[kindOf(live.status).kind] }}>{initials(live)}</span>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{live.first_name} {live.last_name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{live.designation || "—"}</div>
                  </div>
                </div>
                <button type="button" aria-label="Close details" onClick={() => setPicked(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              <dl className="mt-3 grid grid-cols-[84px_1fr] gap-y-1.5 text-sm">
                <dt className="text-slate-500 dark:text-slate-400">Employee ID</dt><dd className="text-slate-900 dark:text-white">{live.employee_code}</dd>
                <dt className="text-slate-500 dark:text-slate-400">Team</dt><dd className="text-slate-900 dark:text-white">{live.team}</dd>
                <dt className="text-slate-500 dark:text-slate-400">Today</dt><dd className="font-semibold text-slate-900 dark:text-white">{live.status}</dd>
              </dl>
            </div>
          );
        })()}

        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Seats" value={totals.seats} />
            <Stat label="WFH" value={totals.wfh} />
            <Stat label="On leave" value={totals.leave} />
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Updated {updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/60">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Team availability</span>
            {selectedTeam && <button type="button" onClick={() => onSelectTeam(null)} className="text-xs font-semibold text-sky-600 dark:text-sky-400 cursor-pointer">View entire office</button>}
          </div>
          <ul className="max-h-[320px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
            {stats.map((s) => (
              <li key={s.name}>
                <button type="button" onClick={() => onSelectTeam(selectedTeam === s.name ? null : s.name)}
                  className={`w-full text-left px-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 ${selectedTeam === s.name ? "bg-sky-50 dark:bg-sky-950/30" : ""}`}>
                  <div className="flex justify-between text-sm"><span className="font-medium text-slate-900 dark:text-white">{s.name}</span><span className="text-slate-500 dark:text-slate-400">{s.total}</span></div>
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="text-green-600 dark:text-green-400">{s.present} present</span> · <span className="text-blue-600 dark:text-blue-400">{s.wfh} WFH</span> · <span className="text-red-600 dark:text-red-400">{s.leave} leave</span>
                    {s.holiday > 0 && <> · {s.holiday} holiday</>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function Legend({ swatch, text }: { swatch: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-2">{swatch}<span>{text}</span></div>;
}
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
