"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  FolderKanban,
  RefreshCw,
  ListTodo,
  CloudDownload,
  AlertCircle,
  Plus,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";
import pmApi from "@/services/pm";
import {
  Project,
  ProjectTask,
  TaskStatus,
} from "@/types/pm";
import { PMDepartmentSwitcher } from "@/components/project-management/PMDepartmentSwitcher";
import { PMDashboardStats, DashboardStatsMetrics } from "@/components/project-management/PMDashboardStats";
import { PMAllTasksTable } from "@/components/project-management/PMAllTasksTable";
import { PMDashboardCharts } from "@/components/project-management/PMDashboardCharts";
import { isPast, isToday, parseISO } from "date-fns";

export default function ProjectManagementDashboard() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";
  const isTeamLead = user?.role === "Team Lead";
  const isEmployee = !isSuperAdmin && !isTeamLead;

  // Department / Team state for Super Admin switcher
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);

  // Coordinators for PC filter dropdown
  const [coordinators, setCoordinators] = useState<
    Array<{ id: number; first_name: string; last_name: string }>
  >([]);

  // Raw data from backend
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [myTasks, setMyTasks] = useState<ProjectTask[]>([]);

  // Loading & error state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [importingHubstaff, setImportingHubstaff] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Table filter states
  const [activeKpiFilter, setActiveKpiFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<number | null>(null);
  const [showTodayOnly, setShowTodayOnly] = useState<boolean>(false);

  const handleImportHubstaff = async () => {
    if (importingHubstaff) return;
    setImportingHubstaff(true);
    setImportNotice(null);
    try {
      const res = await pmApi.importHubstaffProjects();
      if (res.success) {
        setImportNotice(res.message || `Imported ${res.imported_count} projects.`);
        fetchDashboardData(true);
      }
    } catch (err: any) {
      console.warn("Hubstaff import error", err);
    } finally {
      setImportingHubstaff(false);
    }
  };

  // Load teams and coordinators on mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [teamsRes, empsRes] = await Promise.allSettled([
          api.get("/teams"),
          api.get("/employees?per_page=all"),
        ]);

        if (teamsRes.status === "fulfilled") {
          const tData = teamsRes.value.data?.data || teamsRes.value.data || [];
          if (Array.isArray(tData)) setTeams(tData);
        }

        if (empsRes.status === "fulfilled") {
          const rawEmps = empsRes.value.data?.data?.data || empsRes.value.data?.data || [];
          if (Array.isArray(rawEmps)) {
            setCoordinators(
              rawEmps.map((e: any) => ({
                id: e.id,
                first_name: e.first_name,
                last_name: e.last_name,
              }))
            );
          }
        }
      } catch (err) {
        console.warn("Failed to load overview metadata", err);
      }
    };

    loadMetadata();
  }, []);

  // Fetch Dashboard Projects & Tasks
  const fetchDashboardData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const projectParams: any = { per_page: "all" };
        const taskParams: any = { per_page: "all" };

        if (isSuperAdmin && selectedDepartmentId) {
          projectParams.team_id = selectedDepartmentId;
          taskParams.team_id = selectedDepartmentId;
        }

        // Parallel requests for optimal performance
        const promises: Promise<any>[] = [
          pmApi.getProjects(projectParams),
          pmApi.getTasks(taskParams),
        ];

        // For Team Lead or Employee, also fetch my tasks to compute individual KPIs
        if (isTeamLead || isEmployee) {
          promises.push(pmApi.getMyTasks({ page: 1 }));
        }

        const results = await Promise.allSettled(promises);

        if (results[0].status === "fulfilled") {
          const pRes = results[0].value;
          setProjects(pRes.data || []);
        }

        if (results[1].status === "fulfilled") {
          const tRes = results[1].value;
          setTasks(tRes.data || []);
        }

        if (results[2] && results[2].status === "fulfilled") {
          const myRes = results[2].value;
          setMyTasks(myRes.data || []);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load Project Management overview.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isSuperAdmin, selectedDepartmentId, isTeamLead, isEmployee]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Helper to check if task is overdue
  const isTaskOverdue = (dueDateStr?: string | null, status?: TaskStatus): boolean => {
    if (!dueDateStr || status === "Completed" || status === "Rejected") return false;
    try {
      const d = parseISO(dueDateStr);
      return isPast(d) && !isToday(d);
    } catch {
      return false;
    }
  };

  const isActiveStatus = (status: TaskStatus): boolean => {
    return [
      "In Progress",
      "Being Developed",
      "Ready for QA",
      "Assigned to QA",
      "Yet to Start",
      "On Hold",
    ].includes(status);
  };

  // Compute KPI metrics according to strict role specifications
  // For Employee: show only their tasks
  // For Team Lead: show Team total and individual tasks
  // For Super Admin: show department total
  const relevantTaskList = isEmployee ? myTasks : tasks;

  const metrics: DashboardStatsMetrics = {
    totalProjects: projects.length,
    activeTasks: relevantTaskList.filter((t) => isActiveStatus(t.status)).length,
    myActiveTasks: isTeamLead ? myTasks.filter((t) => isActiveStatus(t.status)).length : undefined,
    forecastTasks: relevantTaskList.filter((t) => t.status === "Forecast").length,
    myForecastTasks: isTeamLead ? myTasks.filter((t) => t.status === "Forecast").length : undefined,
    completedTasks: relevantTaskList.filter((t) => t.status === "Completed").length,
    myCompletedTasks: isTeamLead ? myTasks.filter((t) => t.status === "Completed").length : undefined,
    overdueTasks: relevantTaskList.filter((t) => isTaskOverdue(t.due_date, t.status)).length,
    myOverdueTasks: isTeamLead ? myTasks.filter((t) => isTaskOverdue(t.due_date, t.status)).length : undefined,
  };

  // Filter tasks passed to the All Tasks Table based on active KPI filter
  const tableTasks = relevantTaskList.filter((t) => {
    if (!activeKpiFilter || activeKpiFilter.toLowerCase() === "all") return true;

    if (activeKpiFilter.toLowerCase() === "active") {
      return isActiveStatus(t.status);
    }
    if (activeKpiFilter.toLowerCase() === "forecast") {
      return t.status === "Forecast";
    }
    if (activeKpiFilter.toLowerCase() === "completed") {
      return t.status === "Completed";
    }
    if (activeKpiFilter.toLowerCase() === "overdue") {
      return isTaskOverdue(t.due_date, t.status);
    }
    return true;
  });

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8"
    >
      {/* ── Top Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[#56348f] dark:text-purple-300">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Project Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Overview of ongoing deliverables, task tracking, and department metrics.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing || loading}
            aria-label="Refresh Dashboard"
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 !text-slate-800 dark:!text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#56348f]" : "text-slate-700 dark:text-slate-300"}`} />
          </button>

          <Link
            href="/project-management/tasks/my"
            style={{ backgroundColor: "#f3e8ff", color: "#56348f", fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200/80 dark:hover:bg-purple-900/80 !text-[#56348f] dark:!text-purple-300 text-[13px] leading-[20px] font-normal border border-purple-300 dark:border-purple-800/80 shadow-2xs transition-colors"
          >
            <ListTodo className="w-4 h-4 !text-[#56348f] dark:!text-purple-300" />
            <span style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }} className="!text-[#56348f] dark:!text-purple-300">My Tasks</span>
          </Link>

          <button
            type="button"
            onClick={handleImportHubstaff}
            disabled={importingHubstaff || loading}
            style={{ backgroundColor: "#ffffff", color: "#0f172a", fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 !text-slate-900 dark:!text-slate-100 text-[13px] leading-[20px] font-normal border border-slate-300 dark:border-slate-700 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            title="Import all active projects from Hubstaff without duplicating"
          >
            <CloudDownload className={`w-4 h-4 text-sky-600 dark:text-sky-400 ${importingHubstaff ? "animate-spin" : ""}`} />
            <span style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }} className="!text-slate-900 dark:!text-slate-100">{importingHubstaff ? "Importing…" : "Import from Hubstaff"}</span>
          </button>

          <Link
            href="/project-management/projects"
            style={{ backgroundColor: "#56348f", color: "rgb(255, 255, 255)", fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-[13px] leading-[20px] font-normal shadow-sm transition-colors"
          >
            <FolderKanban className="w-4 h-4 !text-white" />
            <span style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400, color: "rgb(255, 255, 255)" }} className="!text-white">View Projects</span>
          </Link>
        </div>
      </div>

      {/* ── Error Banner (if any) ── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to load dashboard data</p>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            className="text-xs font-semibold underline hover:no-underline text-rose-700 dark:text-rose-300 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Super Admin Department Switcher (Top of Overview) ── */}
      {isSuperAdmin && (
        <PMDepartmentSwitcher
          teams={teams}
          selectedTeamId={selectedDepartmentId}
          onSelectTeam={(id) => setSelectedDepartmentId(id)}
          loading={loading}
        />
      )}

      {/* ── 1. Role-Aware KPI Cards ── */}
      <PMDashboardStats
        metrics={metrics}
        userRole={user?.role}
        activeFilter={activeKpiFilter}
        onFilterChange={(filter) => setActiveKpiFilter(filter)}
        loading={loading}
      />

      {/* ── 2. All Tasks Table (Matching Exact Screenshot Columns & Filters) ── */}
      <PMAllTasksTable
        tasks={tableTasks}
        coordinators={coordinators}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        selectedCoordinatorId={selectedCoordinatorId}
        onCoordinatorChange={(id) => setSelectedCoordinatorId(id)}
        showTodayOnly={showTodayOnly}
        onToggleTodayOnly={() => setShowTodayOnly((prev) => !prev)}
        loading={loading}
      />

      {/* ── 3. Infographic Graphs (Matching Exact Screenshot Layout) ── */}
      <PMDashboardCharts tasks={relevantTaskList} />
    </div>
  );
}
