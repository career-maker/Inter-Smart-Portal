"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Search,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Layers,
  FileText
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import pmApi from "@/services/pm";
import {
  ProjectTask,
  TASK_STATUSES,
  PaginatedResponse,
} from "@/types/pm";
import { TaskTrackerTable } from "@/components/project-management/TaskTrackerTable";
import { DailyReportModal } from "@/components/project-management/DailyReportModal";
import teamPermissionsApi from "@/services/teamPermissions";

export default function MyTasksPage() {
  const { user } = useAuthStore();
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    teamPermissionsApi.getMyPermissions()
      .then((res) => {
        setUserPermissions(res.permissions || {});
      })
      .catch((err) => console.warn("Failed to load user permissions in My Tasks", err));
  }, []);

  const canViewAllTasks =
    user?.role === "Super Admin" ||
    user?.role === "Admin" ||
    user?.role === "Team Lead" ||
    Boolean(userPermissions.task_cross_team_view);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tasksData, setTasksData] = useState<PaginatedResponse<ProjectTask> | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);

  const fetchMyTasks = useCallback(
    async (page = 1, isManual = false) => {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await pmApi.getMyTasks({ page });
        setTasksData(data);
        setCurrentPage(page);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to load assigned tasks.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchMyTasks(1);
  }, [fetchMyTasks]);

  const rawList = tasksData?.data || [];
  const filteredTasks = useMemo(() => {
    return rawList.filter((task) => {
      if (statusFilter !== "All" && task.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = task.title?.toLowerCase().includes(q);
        const projMatch = task.project?.name?.toLowerCase().includes(q);
        const sprintMatch = task.sprint?.toLowerCase().includes(q);
        if (!titleMatch && !projMatch && !sprintMatch) return false;
      }
      return true;
    });
  }, [rawList, statusFilter, search]);

  const totalTasks = tasksData?.total ?? rawList.length;
  const lastPage = tasksData?.last_page || 1;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/project-management" className="hover:text-purple-600 dark:hover:text-purple-400">
              Project Management
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/project-management/tasks" className="hover:text-purple-600 dark:hover:text-purple-400">
              Tasks
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white">My Tasks</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            My Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            View all deliverables, sub-phases, and deadlines assigned to you.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {canViewAllTasks && (
            <Link
              href="/project-management/tasks"
              style={{
                backgroundColor: "#56348f",
                color: "rgb(255, 255, 255)",
                fontFamily: '"Proxima Nova", sans-serif',
                fontSize: "12px",
                fontWeight: 600,
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              title="Open All Team Tasks & Switcher"
            >
              <Layers className="w-4 h-4 !text-white" />
              <span className="!text-white">All Team Tasks & Switcher</span>
            </Link>
          )}

          <button
            onClick={() => setIsDailyReportOpen(true)}
            style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-[#56348f] dark:text-purple-300 text-[13px] leading-[20px] font-normal border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
            title="Open My Daily Report"
          >
            <FileText className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
            <span>Daily Reports</span>
          </button>

          <button
            onClick={() => fetchMyTasks(currentPage, true)}
            disabled={refreshing || loading}
            aria-label="Refresh My Tasks"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#56348f]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Filters & Search Header ── */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 shadow-sm space-y-4">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {["All", ...TASK_STATUSES].map((status) => {
            const isSelected = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  backgroundColor: isSelected ? "#56348f" : undefined,
                  color: isSelected ? "rgb(255, 255, 255)" : undefined,
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: "13px",
                  lineHeight: "20px",
                  fontWeight: 400,
                }}
                className={`px-3 py-1 rounded-xl text-[13px] leading-[20px] font-normal whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#56348f] !text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800/60 !text-slate-800 dark:!text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search my tasks by title, project, or sprint..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to load tasks</p>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => fetchMyTasks(currentPage, true)}
            className="text-xs font-semibold underline hover:no-underline text-rose-700 dark:text-rose-300 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Main Content Area ── */}
      {loading ? (
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-16 text-center text-slate-500 space-y-3 animate-pulse">
          <Layers className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
          <p className="text-sm font-semibold">Loading your assignments…</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 py-16 text-center p-6 space-y-3">
          <CheckSquare className="w-10 h-10 mx-auto text-slate-400 opacity-50" />
          <p className="text-base font-bold text-slate-800 dark:text-slate-200">No tasks assigned</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {statusFilter !== "All" || search
              ? "No tasks match your selected filters."
              : "You have no deliverable tasks currently assigned."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <TaskTrackerTable
            tasks={filteredTasks}
            canEdit={false}
          />

          {/* Pagination Footer */}
          {totalTasks > 0 && lastPage > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500">
              <div>
                Showing page <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong>{" "}
                of <strong className="text-slate-800 dark:text-slate-200">{lastPage}</strong> (
                {totalTasks} total tasks)
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchMyTasks(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <button
                  onClick={() => fetchMyTasks(currentPage + 1)}
                  disabled={currentPage >= lastPage || loading}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Daily Reports Modal ── */}
      <DailyReportModal
        isOpen={isDailyReportOpen}
        onClose={() => setIsDailyReportOpen(false)}
      />
    </div>
  );
}
