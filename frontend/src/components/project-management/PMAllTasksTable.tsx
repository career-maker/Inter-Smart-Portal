"use client";

import { useState, useMemo } from "react";
import { ProjectTask, TaskStatus } from "@/types/pm";
import {
  Layers,
  Search,
  Calendar,
  PlayCircle,
  Circle,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Clock,
  User,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format, parseISO, isToday } from "date-fns";

interface PMAllTasksTableProps {
  tasks: ProjectTask[];
  coordinators: Array<{ id: number; first_name: string; last_name: string }>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCoordinatorId: number | null;
  onCoordinatorChange: (id: number | null) => void;
  showTodayOnly: boolean;
  onToggleTodayOnly: () => void;
  loading?: boolean;
}

export function PMAllTasksTable({
  tasks,
  coordinators,
  searchQuery,
  onSearchChange,
  selectedCoordinatorId,
  onCoordinatorChange,
  showTodayOnly,
  onToggleTodayOnly,
  loading = false,
}: PMAllTasksTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filter tasks locally by search, coordinator, and today-only toggle
  const filteredTasks = useMemo(() => {
    let list = tasks;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => {
        const titleMatch = (t.title || "").toLowerCase().includes(q);
        const projMatch = (t.project?.name || "").toLowerCase().includes(q);
        const phaseMatch = (t.sub_phase?.name || "").toLowerCase().includes(q);
        const assigneeMatch = (t.assignees || []).some((a) =>
          `${a.first_name} ${a.last_name}`.toLowerCase().includes(q)
        );
        return titleMatch || projMatch || phaseMatch || assigneeMatch;
      });
    }

    // Coordinator filter
    if (selectedCoordinatorId) {
      list = list.filter((t) => {
        const taskCoordId = t.coordinator?.id || (t.project as any)?.project_coordinator_id;
        return taskCoordId === selectedCoordinatorId;
      });
    }

    // Present Day filter
    if (showTodayOnly) {
      list = list.filter((t) => {
        if (!t.start_date && !t.due_date) return false;
        try {
          const sDate = t.start_date ? parseISO(t.start_date) : null;
          const dDate = t.due_date ? parseISO(t.due_date) : null;
          return (sDate && isToday(sDate)) || (dDate && isToday(dDate));
        } catch {
          return false;
        }
      });
    }

    return list;
  }, [tasks, searchQuery, selectedCoordinatorId, showTodayOnly]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(start, start + itemsPerPage);
  }, [filteredTasks, currentPage]);

  const renderStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "In Progress":
      case "Being Developed":
        return (
          <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-xs">
            <PlayCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>In Progress</span>
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Completed</span>
          </span>
        );
      case "On Hold":
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs">
            <PauseCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>On Hold</span>
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold text-xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Rejected</span>
          </span>
        );
      case "Ready for QA":
      case "Assigned to QA":
        return (
          <span className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold text-xs">
            <PlayCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>{status}</span>
          </span>
        );
      case "Yet to Start":
      case "Forecast":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-semibold text-xs">
            <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{status || "Yet to Start"}</span>
          </span>
        );
    }
  };

  const formatTimeline = (startDate?: string | null, dueDate?: string | null) => {
    if (!startDate && !dueDate) {
      return <span className="italic text-slate-400 dark:text-slate-500">No timeline</span>;
    }

    try {
      const s = startDate ? format(parseISO(startDate), "dd/MM") : "—";
      const d = dueDate ? format(parseISO(dueDate), "dd/MM") : "—";
      return <span>{s} - {d}</span>;
    } catch {
      return <span className="italic text-slate-400 dark:text-slate-500">No timeline</span>;
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* ── Table Header / Filter Bar ── */}
      <div className="p-4 sm:p-5 border-b border-slate-200/90 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/50">
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#56348f] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Layers className="w-5 h-5" />
          </div>
          <h2
            style={{
              fontFamily: '"Proxima Nova", sans-serif',
              fontSize: "13px",
              lineHeight: "20px",
              fontWeight: 500,
              color: "rgb(15, 24, 36)",
            }}
            className="dark:!text-white tracking-tight box-title"
          >
            All Tasks
          </h2>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#56348f]/20 focus:border-[#56348f]"
            />
          </div>

          {/* All PCs Coordinator Filter */}
          <div className="relative">
            <select
              value={selectedCoordinatorId || ""}
              onChange={(e) => onCoordinatorChange(e.target.value ? Number(e.target.value) : null)}
              className="pl-3 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#56348f]/20 focus:border-[#56348f] cursor-pointer"
            >
              <option value="">All PCs</option>
              {coordinators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Results Count Pill */}
          <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400">
            {filteredTasks.length} total results
          </div>

          {/* Present Day Filter Toggle */}
          <button
            type="button"
            onClick={onToggleTodayOnly}
            style={showTodayOnly ? { backgroundColor: "#56348f", color: "#ffffff" } : undefined}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer shadow-xs ${
              showTodayOnly
                ? "bg-[#56348f] border-[#56348f] !text-white shadow-sm"
                : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 !text-slate-800 dark:!text-slate-100 hover:bg-purple-50 dark:hover:bg-slate-800"
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 ${showTodayOnly ? "!text-white" : "text-[#56348f] dark:text-purple-400"}`} />
            <span className={showTodayOnly ? "!text-white font-bold" : "!text-slate-800 dark:!text-slate-100 font-bold"}>Present Day</span>
          </button>
        </div>
      </div>

      {/* ── Table Content ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4 min-w-[220px]">PROJECT</th>
              <th className="py-3.5 px-4 min-w-[140px]">PHASE</th>
              <th className="py-3.5 px-4 min-w-[130px]">STATUS</th>
              <th className="py-3.5 px-4 min-w-[160px]">ASSIGNEES</th>
              <th className="py-3.5 px-4 min-w-[130px]">TIMELINE</th>
              <th className="py-3.5 px-4 min-w-[120px]">COMMENTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  Loading tasks…
                </td>
              </tr>
            ) : paginatedTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  No matching tasks found.
                </td>
              </tr>
            ) : (
              paginatedTasks.map((task) => {
                const assigneesText =
                  task.assignees && task.assignees.length > 0
                    ? task.assignees.map((a) => `${a.first_name} ${a.last_name}`).join(", ")
                    : "—";

                const latestComment =
                  (task as any).comments && (task as any).comments.length > 0
                    ? (task as any).comments[0]?.comment
                    : (task as any).current_updates || "-";

                return (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors group"
                  >
                    {/* Project & Title */}
                    <td className="py-3.5 px-4">
                      <div
                        style={{
                          fontFamily: '"Proxima Nova", sans-serif',
                          fontSize: "13px",
                          lineHeight: "20px",
                          fontWeight: 400,
                          color: "rgb(15, 24, 36)",
                        }}
                        className="dark:!text-white group-hover:!text-[#56348f] dark:group-hover:!text-purple-300 transition-colors"
                      >
                        {task.project?.name ? `${task.project.name} / ${task.title}` : task.title}
                      </div>
                      {(task.project as any)?.category && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-normal">
                          {(task.project as any).category}
                        </span>
                      )}
                    </td>

                    {/* Phase */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs">
                      {task.sub_phase?.name || (task.catalog_task as any)?.name || "-"}
                    </td>

                    {/* Status Badge with icon */}
                    <td className="py-3.5 px-4">{renderStatusBadge(task.status)}</td>

                    {/* Assignees */}
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200 text-xs">
                      {assigneesText}
                    </td>

                    {/* Timeline */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs font-normal">
                      {formatTimeline(task.start_date, task.due_date)}
                    </td>

                    {/* Comments */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs max-w-[200px] truncate" title={latestComment}>
                      {latestComment}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Table Pagination Footer ── */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
