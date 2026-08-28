"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  FolderKanban,
  Edit3,
  Trash2,
  Plus,
  Users,
  UserPlus,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Clock,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  FileText,
  DollarSign,
  Layers,
  CheckCircle2,
  Info,
  Link2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";
import pmApi from "@/services/pm";
import {
  Project,
  ProjectMemberUser,
  ProjectMember,
  ProjectRole
} from "@/types/pm";
import { ProjectStatusBadge } from "@/components/project-management/ProjectStatusBadge";
import { EditProjectModal } from "@/components/project-management/EditProjectModal";
import { AddProjectMemberModal } from "@/components/project-management/AddProjectMemberModal";
import { CreateTaskModal } from "@/components/project-management/CreateTaskModal";
import { SearchableCoordinatorSelect } from "@/components/project-management/SearchableCoordinatorSelect";

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const resolvedParams = use(params);
  const projectId = Number(resolvedParams.id);
  const router = useRouter();

  const { user } = useAuthStore();
  const isSuperAdmin = (user?.role || "").toLowerCase() === "super admin";
  const isTeamLead = (user?.role || "").toLowerCase() === "team lead";

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMemberUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  // Coordinator change selector state
  const [coordinators, setCoordinators] = useState<
    { id: number; first_name: string; last_name: string; employee_code?: string; department?: string }[]
  >([]);
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<string>("");
  const [savingCoordinator, setSavingCoordinator] = useState(false);

  const fetchProjectDetails = useCallback(
    async (isManual = false) => {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [projRes, membersRes] = await Promise.allSettled([
          pmApi.getProject(projectId),
          pmApi.getProjectMembers(projectId),
        ]);

        if (projRes.status === "fulfilled") {
          setProject(projRes.value.data);
          setSelectedCoordinatorId(
            projRes.value.data.project_coordinator_id
              ? String(projRes.value.data.project_coordinator_id)
              : ""
          );
        } else {
          throw projRes.reason;
        }

        if (membersRes.status === "fulfilled") {
          setMembers(membersRes.value.data || []);
        }
      } catch (err: any) {
        const msg =
          err?.response?.status === 404
            ? "Project not found or you do not have permission to view it."
            : err?.response?.data?.message || err?.message || "Failed to load project details.";
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  // Load eligible coordinators for quick-assignment
  useEffect(() => {
    const fetchCoordinators = async () => {
      try {
        const res = await api.get("/employees?per_page=all");
        const raw = res.data?.data?.data || res.data?.data || [];
        if (Array.isArray(raw)) {
          const mapped = raw.map((e: any) => ({
            id: e.id,
            first_name: e.first_name,
            last_name: e.last_name,
            employee_code: e.employee_code,
            department: e.team?.name || "General",
          }));
          setCoordinators(mapped);
        }
      } catch (err) {
        console.warn("Failed to load coordinators list", err);
      }
    };
    fetchCoordinators();
  }, []);

  const handleArchiveProject = async () => {
    setArchiving(true);
    try {
      await pmApi.deleteProject(projectId);
      router.push("/project-management/projects");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to archive project.");
      setIsArchiveDialogOpen(false);
    } finally {
      setArchiving(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm("Are you sure you want to remove this member from the project?")) return;

    setRemovingMemberId(userId);
    try {
      await pmApi.removeProjectMember(projectId, userId);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to remove member.");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleSaveCoordinator = async () => {
    setSavingCoordinator(true);
    try {
      const coordId = selectedCoordinatorId ? Number(selectedCoordinatorId) : null;
      const res = await pmApi.setProjectCoordinator(projectId, { project_coordinator_id: coordId });
      setProject(res.data);
      alert("Project Coordinator updated successfully.");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update project coordinator.");
    } finally {
      setSavingCoordinator(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 py-24 text-center space-y-4 animate-pulse">
        <FolderKanban className="w-10 h-10 mx-auto text-blue-500 opacity-60" />
        <p className="text-sm font-semibold text-slate-500">Loading project details…</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-xl mx-auto p-6 my-16 text-center rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Project Inaccessible</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{error || "Project could not be found."}</p>
        <Link
          href="/project-management/projects"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Top Breadcrumb & Actions Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            <Link href="/project-management" className="hover:text-blue-600 dark:hover:text-blue-400">
              Project Management
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link
              href="/project-management/projects"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Projects
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white line-clamp-1">{project.name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {project.name}
            </h1>
            <ProjectStatusBadge status={project.status} />
            {project.hubstaff_project_id && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                <Link2 className="w-3 h-3 text-emerald-600" />
                <span>Hubstaff Linked (#{project.hubstaff_project_id})</span>
              </span>
            )}
            {project.category && (
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                {project.category}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchProjectDetails(true)}
            disabled={refreshing}
            aria-label="Refresh Details"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
            title="Refresh Details"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#56348f]" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateTaskModalOpen(true)}
            style={{ backgroundColor: "#56348f", color: "rgb(255, 255, 255)", fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }}
            className="whitespace-nowrap inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-[13px] leading-[20px] font-normal shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 !text-white shrink-0" />
            <span className="whitespace-nowrap !text-white">Add Task</span>
          </button>

          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }}
                className="whitespace-nowrap inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[13px] leading-[20px] font-normal border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-[#56348f] dark:text-purple-400 shrink-0" />
                <span className="whitespace-nowrap">Edit Project</span>
              </button>

              <button
                type="button"
                onClick={() => setIsArchiveDialogOpen(true)}
                className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 transition-colors shrink-0 cursor-pointer"
                title="Archive Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Key Metrics Overview Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Owning Team */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Building2 className="w-4 h-4 text-blue-500" />
            <span>Owning Department</span>
          </div>
          <div className="mt-2 text-base font-bold text-slate-900 dark:text-white">
            {project.team?.name || "Cross-Department"}
          </div>
          <span className="text-[11px] text-slate-400">Primary delivery team</span>
        </div>

        {/* Metric 2: Project Coordinator */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <User className="w-4 h-4 text-purple-500" />
            <span>Project Coordinator</span>
          </div>
          <div className="mt-2 text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {project.coordinator ? (
              <>
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">
                  {project.coordinator.first_name?.[0]}
                  {project.coordinator.last_name?.[0]}
                </span>
                <span>
                  {project.coordinator.first_name} {project.coordinator.last_name}
                </span>
              </>
            ) : (
              <span className="text-slate-400 italic">Unassigned</span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">Assigned coordination lead</span>
        </div>

        {/* Metric 3: Timeline */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>Target Timeline</span>
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
            {formatDateDisplay(project.start_date)} → {formatDateDisplay(project.expected_end_date)}
          </div>
          <span className="text-[11px] text-slate-400">Start & expected completion</span>
        </div>

        {/* Metric 4: Effort & Budget */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Effort & Budget</span>
          </div>
          <div className="mt-2 text-base font-bold text-slate-900 dark:text-white">
            {project.allotted_effort ? `${project.allotted_effort} hrs` : "—"}
            {project.budget ? ` / ₹${project.budget.toLocaleString()}` : ""}
          </div>
          <span className="text-[11px] text-slate-400">Planned capacity allocation</span>
        </div>
      </div>

      {/* ── Active Blockers Alert (if any) ── */}
      {project.blockers && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Active Blockers / Dependencies:</span>
            <p className="text-xs text-rose-600 dark:text-rose-300/90 mt-0.5">{project.blockers}</p>
          </div>
        </div>
      )}

      {/* ── Two-Column Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on lg screen): Description, Notes & Members */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Description & Scope */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Project Description & Scope</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {project.description || "No detailed description provided for this project."}
            </p>

            {(project.live_notes || project.fixing_notes) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {project.live_notes && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Live Notes:
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
                      {project.live_notes}
                    </p>
                  </div>
                )}
                {project.fixing_notes && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Fixing / Patch Notes:
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
                      {project.fixing_notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Project Members Roster */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Project Members ({members.length})
                </span>
              </div>

              {(isSuperAdmin || isTeamLead) && (
                <button
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-200 dark:border-blue-800/60 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            {members.length === 0 ? (
              <div className="py-8 text-center rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 p-4">
                <Users className="w-6 h-6 text-slate-400 mx-auto mb-1.5 opacity-60" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No project members added yet
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Members added here will have participant visibility over this project.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">
                        {member.first_name?.[0]}
                        {member.last_name?.[0]}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                          {member.first_name} {member.last_name}
                          {member.employee_code && (
                            <span className="text-[11px] text-slate-400 ml-1.5">
                              ({member.employee_code})
                            </span>
                          )}
                        </div>
                        {member.pivot?.project_role && (
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            {member.pivot.project_role}
                          </span>
                        )}
                      </div>
                    </div>

                    {(isSuperAdmin || isTeamLead) && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingMemberId === member.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                        title="Remove member"
                      >
                        {removingMemberId === member.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col on lg screen): Coordinator Settings & Roadmap Notice */}
        <div className="space-y-6">
          {/* Section: Coordinator Assignment Box */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              <span>Project Coordinator</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Coordinators are employees from the <strong>&quot;Project Coordinators&quot;</strong> department
              who receive milestone notifications and coordinate delivery.
            </p>

            {isSuperAdmin ? (
              <div className="space-y-3 pt-2">
                <SearchableCoordinatorSelect
                  value={selectedCoordinatorId ? Number(selectedCoordinatorId) : null}
                  onChange={(val) => setSelectedCoordinatorId(val ? String(val) : "")}
                  coordinators={coordinators}
                  placeholder="No Coordinator Assigned"
                />

                <button
                  type="button"
                  onClick={handleSaveCoordinator}
                  disabled={savingCoordinator}
                  style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[13px] leading-[20px] font-normal border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingCoordinator ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#56348f]" />
                      <span>Saving Coordinator…</span>
                    </>
                  ) : (
                    <span>Update Coordinator</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs font-medium text-slate-700 dark:text-slate-300">
                {project.coordinator ? (
                  <div>
                    <strong className="block text-slate-900 dark:text-white">
                      {project.coordinator.first_name} {project.coordinator.last_name}
                    </strong>
                    <span className="text-[11px] text-slate-400">{project.coordinator.email}</span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">No coordinator assigned</span>
                )}
              </div>
            )}
          </div>

          {/* Section: Stage 8.4 Tasks Notice */}
          <div className="rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>Tasks & Sub-Phases</span>
            </div>
            <p className="text-xs text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
              Task allocations, milestone sub-phases, and execution tracking for <strong>{project.name}</strong> will
              be configured in <strong>Stage 8.4</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ── Edit Project Modal ── */}
      <EditProjectModal
        project={project}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(updated) => setProject(updated)}
      />

      {/* ── Add Project Member Modal ── */}
      <AddProjectMemberModal
        projectId={project.id}
        existingMemberUserIds={members.map((m) => m.id)}
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSuccess={(newMember) => {
          if (newMember.user) {
            setMembers((prev) => [
              ...prev,
              {
                id: newMember.user!.id,
                first_name: newMember.user!.first_name,
                last_name: newMember.user!.last_name,
                employee_code: newMember.user!.employee_code,
                pivot: {
                  project_id: newMember.project_id,
                  user_id: newMember.user_id,
                  project_role: newMember.project_role,
                },
              },
            ]);
          } else {
            fetchProjectDetails(true);
          }
        }}
      />

      {/* ── Archive Confirmation Dialog ── */}
      {isArchiveDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Archive Project</h3>
                <p className="text-xs text-slate-500">Soft-delete project deliverable</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to archive <strong>{project.name}</strong>? This will remove it from
              active directory views while preserving audit and historical records.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsArchiveDialogOpen(false)}
                disabled={archiving}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveProject}
                disabled={archiving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {archiving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Archiving…</span>
                  </>
                ) : (
                  <span>Yes, Archive Project</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
