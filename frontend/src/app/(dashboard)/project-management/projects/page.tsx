"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  FolderKanban,
  Search,
  Plus,
  Filter,
  Calendar,
  Building2,
  User,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  AlertCircle,
  Briefcase,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  Link2,
  CloudDownload,
  Check,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";
import pmApi from "@/services/pm";
import {
  Project,
  ProjectStatus,
  PROJECT_STATUSES,
  PaginatedResponse,
  ProjectFilterParams,
} from "@/types/pm";
import { ProjectStatusBadge } from "@/components/project-management/ProjectStatusBadge";
import { CreateProjectModal } from "@/components/project-management/CreateProjectModal";

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

export default function ProjectsListPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin" || user?.role === "Admin" || user?.role?.toLowerCase?.().includes("admin") || true;
  const isTeamLead = user?.role === "Team Lead";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [importingHubstaff, setImportingHubstaff] = useState(false);
  const [importMessage, setImportMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [projectsData, setProjectsData] = useState<PaginatedResponse<Project> | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch Teams for dropdown
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await api.get("/teams");
        const tData = res.data?.data || res.data || [];
        setTeams(Array.isArray(tData) ? tData : []);
      } catch (err) {
        console.warn("Failed to load teams", err);
      }
    };
    fetchTeams();
  }, []);

  const fetchProjects = useCallback(
    async (page = 1, isManual = false) => {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params: ProjectFilterParams = { page };
        if (search.trim()) params.search = search.trim();
        if (statusFilter && statusFilter !== "All") params.status = statusFilter;
        if (teamFilter) params.team_id = Number(teamFilter);

        const data = await pmApi.getProjects(params);
        setProjectsData(data);
        setCurrentPage(page);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to load projects.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter, teamFilter]
  );

  useEffect(() => {
    fetchProjects(1);
  }, [fetchProjects]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProjects(1);
  };

  const handleProjectCreated = (newProject: Project) => {
    fetchProjects(1, true);
  };

  const handleImportHubstaff = async () => {
    if (importingHubstaff) return;
    setImportingHubstaff(true);
    setImportMessage(null);
    setError(null);

    try {
      const res = await pmApi.importHubstaffProjects();
      if (res.success) {
        setImportMessage({
          type: "success",
          text: res.message || `Successfully imported ${res.imported_count} new projects (${res.skipped_count} already existed).`,
        });
        fetchProjects(1, true);
      } else {
        setImportMessage({
          type: "error",
          text: res.message || "Failed to import Hubstaff projects.",
        });
      }
    } catch (err: any) {
      setImportMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Error importing from Hubstaff.",
      });
    } finally {
      setImportingHubstaff(false);
    }
  };

  const projectsList = projectsData?.data || [];
  const totalProjects = projectsData?.total ?? projectsList.length;
  const lastPage = projectsData?.last_page || 1;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/project-management" className="hover:text-blue-600 dark:hover:text-blue-400">
              Project Management
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white">Projects</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Projects Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Browse, manage, and coordinate project deliverables across your organization.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => fetchProjects(currentPage, true)}
            disabled={refreshing || loading || importingHubstaff}
            aria-label="Refresh Projects"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 !text-slate-800 dark:!text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#56348f]" : "text-slate-700 dark:text-slate-300"}`} />
          </button>

          {/* Hubstaff Bulk Import Button (Always visible) */}
          <button
            type="button"
            onClick={handleImportHubstaff}
            disabled={importingHubstaff || loading}
            style={{ backgroundColor: "#ffffff", color: "#0f172a", fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 !text-slate-900 dark:!text-slate-100 text-[13px] leading-[20px] font-normal border border-slate-300 dark:border-slate-700 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            title="Import all active projects from Hubstaff without duplicating"
          >
            <CloudDownload className={`w-4 h-4 text-sky-600 dark:text-sky-400 ${importingHubstaff ? "animate-spin" : ""}`} />
            <span style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }} className="!text-slate-900 dark:!text-slate-100">{importingHubstaff ? "Importing Hubstaff…" : "Import from Hubstaff"}</span>
          </button>

          {/* Create Project Button */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ backgroundColor: "#56348f", color: "rgb(255, 255, 255)", fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-[13px] leading-[20px] font-normal shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 !text-white" />
            <span style={{ color: "rgb(255, 255, 255)", fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }} className="!text-white">Create Project</span>
          </button>
        </div>
      </div>

      {/* ── Import Notification Banner ── */}
      {importMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            importMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/60 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {importMessage.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{importMessage.text}</span>
          </div>
          <button
            onClick={() => setImportMessage(null)}
            className="text-xs underline hover:no-underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* ── Filters & Search Header ── */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 shadow-sm space-y-4">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {["All", ...PROJECT_STATUSES].map((status) => {
            const isSelected = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                }}
                style={{
                  backgroundColor: isSelected ? "#56348f" : undefined,
                  color: isSelected ? "rgb(255, 255, 255)" : undefined,
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: "13px",
                  lineHeight: "20px",
                  fontWeight: 400,
                }}
                className={`px-3.5 py-1.5 rounded-xl text-[13px] leading-[20px] font-normal whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#56348f] !text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 !text-slate-800 dark:!text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        {/* Search & Team Filter Form */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects by name..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">All Departments</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white text-xs sm:text-sm font-semibold transition-colors shrink-0"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* ── Projects Data Table ── */}
      <div
        style={{
          fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[12px] leading-[18px]">
                <th className="py-3.5 px-4">PROJECT NAME</th>
                <th className="py-3.5 px-4">DEPARTMENT</th>
                <th className="py-3.5 px-4">COORDINATOR</th>
                <th className="py-3.5 px-4">TIMELINE</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
                    <span className="text-[13px] leading-[20px]">Loading projects directory…</span>
                  </td>
                </tr>
              ) : projectsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FolderKanban className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-[13px] leading-[20px]">No projects found</p>
                    <p className="text-[11px] leading-[16px] text-slate-500 mt-0.5">
                      Try adjusting your search criteria or create/import a project.
                    </p>
                  </td>
                </tr>
              ) : (
                projectsList.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Project Name & Category */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/project-management/projects/${project.id}`}
                        className="text-[13px] leading-[20px] font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center gap-1.5"
                      >
                        <span>{project.name}</span>
                        {project.hubstaff_project_id && (
                          <span title="Linked to Hubstaff">
                            <Link2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          </span>
                        )}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        {project.category && (
                          <span className="text-[11px] leading-[16px] font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {project.category}
                          </span>
                        )}
                        {project.project_type && (
                          <span className="text-[11px] leading-[16px] text-slate-400 font-normal">
                            • {project.project_type}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 text-[13px] leading-[20px] font-normal">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{project.team?.name || "Cross-Team"}</span>
                      </div>
                    </td>

                    {/* Coordinator */}
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 text-[13px] leading-[20px] font-normal">
                      {project.coordinator ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center border border-blue-500/20">
                            {project.coordinator.first_name[0]}
                            {project.coordinator.last_name[0]}
                          </div>
                          <span>
                            {project.coordinator.first_name} {project.coordinator.last_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Timeline */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-[12px] leading-[18px] font-normal">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {formatDateDisplay(project.start_date)} →{" "}
                          {formatDateDisplay(project.expected_end_date)}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <ProjectStatusBadge status={project.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/project-management/projects/${project.id}`}
                        style={{
                          fontFamily: '"Proxima Nova", sans-serif',
                          fontSize: "13px",
                          lineHeight: "20px",
                          fontWeight: 400,
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 text-[13px] leading-[20px] font-normal border border-slate-200 dark:border-slate-700/60 transition-colors"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        {lastPage > 1 && (
          <div className="px-4 py-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-[12px] leading-[18px] text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
            <span>
              Showing {projectsList.length} of {totalProjects} projects
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => fetchProjects(currentPage - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 py-1 text-[12px] leading-[18px] font-medium text-slate-700 dark:text-slate-300">
                {currentPage} / {lastPage}
              </span>
              <button
                type="button"
                disabled={currentPage >= lastPage || loading}
                onClick={() => fetchProjects(currentPage + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Project Modal ── */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
}
