"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bug,
  ArrowLeft,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  AlertTriangle,
  RotateCcw,
  MessageSquare,
  History,
  Paperclip,
  GitCommit,
  ExternalLink,
  Edit2,
  Check,
  X,
  Upload,
  User as UserIcon,
  Layers,
  Send,
  Trash2,
  Lock,
  Plus,
  RefreshCw,
} from "lucide-react";
import { bugzillaApi } from "@/services/bugzilla";
import { pmApi } from "@/services/pm";
import {
  BugzillaBug,
  BugzillaComment,
  BugzillaAttachment,
  BugzillaHistory,
  BugzillaDependency,
  BugzillaComponent,
  BugzillaStatus,
  BugzillaResolution,
  BugzillaSeverity,
  BugzillaPriority,
  BugzillaWatcher,
} from "@/types/bugzilla";
import { ProjectMemberUser } from "@/types/pm";
import { BugzillaStatusBadge } from "@/components/bugzilla/BugzillaStatusBadge";
import { BugzillaSeverityBadge } from "@/components/bugzilla/BugzillaSeverityBadge";
import { BugzillaPriorityBadge } from "@/components/bugzilla/BugzillaPriorityBadge";
import { PageLoader } from "@/components/ui/PageLoader";
import { useBugzillaAuth } from "@/hooks/useBugzillaAuth";
import { useAuthStore } from "@/store/auth";

const RESOLUTIONS: BugzillaResolution[] = [
  "FIXED",
  "INVALID",
  "WONTFIX",
  "DUPLICATE",
  "WORKSFORME",
  "INCOMPLETE",
];

export default function BugzillaBugDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const bugId = Number(resolvedParams.id);
  const router = useRouter();
  const { user } = useAuthStore();
  const { canDevelop, canReport, isSuperAdmin } = useBugzillaAuth();

  // Core bug data
  const [bug, setBug] = useState<BugzillaBug | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<"details" | "comments" | "history" | "attachments" | "dependencies">("details");

  // Related collections
  const [comments, setComments] = useState<BugzillaComment[]>([]);
  const [history, setHistory] = useState<BugzillaHistory[]>([]);
  const [attachments, setAttachments] = useState<BugzillaAttachment[]>([]);
  const [dependencies, setDependencies] = useState<BugzillaDependency[]>([]);
  const [components, setComponents] = useState<BugzillaComponent[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberUser[]>([]);

  // Watch state
  const [isWatching, setIsWatching] = useState(false);

  // Comment input
  const [newComment, setNewComment] = useState("");
  const [commentIsPrivate, setCommentIsPrivate] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Dependency add state
  const [depBugNumberOrId, setDepBugNumberOrId] = useState("");
  const [depType, setDepType] = useState<"depends_on" | "blocks">("depends_on");
  const [addingDep, setAddingDep] = useState(false);

  // Resolve Dialog state
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<BugzillaResolution>("FIXED");

  // Inline editing state for description/steps
  const [isEditingRepro, setIsEditingRepro] = useState(false);
  const [editSteps, setEditSteps] = useState("");
  const [editExpected, setEditExpected] = useState("");
  const [editActual, setEditActual] = useState("");
  const [savingRepro, setSavingRepro] = useState(false);

  // Load bug data
  const fetchBug = useCallback(async () => {
    try {
      const res = await bugzillaApi.getBug(bugId);
      const b = res.data;
      setBug(b);
      setEditSteps(b.steps_to_reproduce || "");
      setEditExpected(b.expected_result || "");
      setEditActual(b.actual_result || "");

      if (user?.id && b.watchers) {
        setIsWatching(b.watchers.some((w: BugzillaWatcher) => w.user_id === user.id));
      }

      // Load components for the bugzilla project
      if (b.bugzilla_project_id) {
        bugzillaApi
          .getComponents(b.bugzilla_project_id)
          .then((compRes) => setComponents(compRes.data || []))
          .catch((e) => console.warn("Failed to load components", e));
      }

      // Load project members for assignee dropdown
      if (b.portal_project_id) {
        pmApi
          .getProjectMembers(b.portal_project_id)
          .then((memRes) => setProjectMembers(memRes.data || []))
          .catch((e) => console.warn("Failed to load project members", e));
      }
    } catch (err: any) {
      console.error("Failed to load bug detail", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load bug.");
    } finally {
      setLoading(false);
    }
  }, [bugId, user?.id]);

  useEffect(() => {
    fetchBug();
  }, [fetchBug]);

  // Load sub-resources depending on active tab
  useEffect(() => {
    if (!bugId) return;

    if (activeTab === "comments") {
      bugzillaApi.getComments(bugId).then((r) => setComments(r.data || [])).catch(console.warn);
    } else if (activeTab === "history") {
      bugzillaApi.getHistory(bugId).then((r) => setHistory(r.data || [])).catch(console.warn);
    } else if (activeTab === "attachments") {
      bugzillaApi.getAttachments(bugId).then((r) => setAttachments(r.data || [])).catch(console.warn);
    } else if (activeTab === "dependencies") {
      bugzillaApi.getDependencies(bugId).then((r) => setDependencies(r.data || [])).catch(console.warn);
    }
  }, [bugId, activeTab]);

  // Status transitions
  const handleUpdateStatus = async (newStatus: BugzillaStatus, resolution?: BugzillaResolution) => {
    setActionLoading(true);
    setError(null);
    try {
      const payload: any = { status: newStatus };
      if (resolution) payload.resolution = resolution;
      else if (newStatus === "REOPENED") payload.resolution = null;

      const res = await bugzillaApi.updateBug(bugId, payload);
      setBug(res.data);
      setResolveDialogOpen(false);
      // Reload history
      bugzillaApi.getHistory(bugId).then((r) => setHistory(r.data || []));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update bug status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Inline field update (severity, priority, assignee, component)
  const handleInlineUpdate = async (patch: Record<string, any>) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await bugzillaApi.updateBug(bugId, patch);
      setBug(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update field.");
    } finally {
      setActionLoading(false);
    }
  };

  // Save reproduction steps
  const handleSaveRepro = async () => {
    setSavingRepro(true);
    setError(null);
    try {
      const res = await bugzillaApi.updateBug(bugId, {
        steps_to_reproduce: editSteps,
        expected_result: editExpected,
        actual_result: editActual,
      });
      setBug(res.data);
      setIsEditingRepro(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to save reproduction info.");
    } finally {
      setSavingRepro(false);
    }
  };

  // Watch toggle
  const handleToggleWatch = async () => {
    try {
      const res = await bugzillaApi.toggleWatch(bugId);
      setIsWatching(res.watching);
    } catch (err: any) {
      console.warn("Failed to toggle watch", err);
    }
  };

  // Add comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await bugzillaApi.addComment(bugId, newComment.trim(), commentIsPrivate);
      setComments((prev) => [res.data, ...prev]);
      setNewComment("");
      setCommentIsPrivate(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to add comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Upload attachment
  const handleUploadAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploadingAttachment(true);
    try {
      const res = await bugzillaApi.uploadAttachment(bugId, uploadFile, uploadDescription);
      setAttachments((prev) => [res.data, ...prev]);
      setUploadFile(null);
      setUploadDescription("");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to upload attachment.");
    } finally {
      setUploadingAttachment(false);
    }
  };

  // Delete attachment
  const handleDeleteAttachment = async (attId: number) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;
    try {
      await bugzillaApi.deleteAttachment(attId);
      setAttachments((prev) => prev.filter((a) => a.id !== attId));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to remove attachment.");
    }
  };

  // Add dependency
  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = depBugNumberOrId.trim().toUpperCase().replace("BZ-", "");
    const targetId = Number(clean);
    if (!targetId || targetId === bugId) return;

    setAddingDep(true);
    try {
      const res = await bugzillaApi.addDependency(bugId, targetId, depType);
      setDependencies((prev) => [...prev, res.data]);
      setDepBugNumberOrId("");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to link dependency.");
    } finally {
      setAddingDep(false);
    }
  };

  // Delete dependency
  const handleDeleteDependency = async (depId: number) => {
    try {
      await bugzillaApi.deleteDependency(depId);
      setDependencies((prev) => prev.filter((d) => d.id !== depId));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to remove dependency.");
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!bug) {
    return (
      <div className="p-8 text-center text-slate-500 space-y-3">
        <Bug className="w-12 h-12 mx-auto text-slate-300" />
        <h3 className="font-bold">Defect Not Found</h3>
        <p className="text-xs text-slate-400">The requested bug does not exist or you lack authorization.</p>
        <Link
          href="/project-management/bugsmart/bugs"
          className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white"
        >
          Return to Bug Registry
        </Link>
      </div>
    );
  }

  const isReporter = user?.id === bug.reporter_id;
  const canEditReporterFields = canReport && (isReporter || canDevelop || isSuperAdmin);

  return (
    <div className="space-y-6 pb-16">
      {/* ── Top Navigation / Breadcrumb ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/project-management/bugsmart/bugs"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                {bug.bug_number}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <Link
                href={`/project-management/projects/${bug.portal_project_id}`}
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1"
              >
                <span>{bug.project?.name}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>
              {bug.task && (
                <>
                  <span className="text-xs text-slate-400">•</span>
                  <Link
                    href={`/project-management/tasks/${bug.task_id}`}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>Task #{bug.task_id}: {bug.task.title}</span>
                    <ExternalLink className="w-3 h-3 text-indigo-400" />
                  </Link>
                </>
              )}
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {bug.summary}
            </h1>
          </div>
        </div>

        {/* Watcher button & Quick action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleWatch}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isWatching
                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
            }`}
          >
            {isWatching ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isWatching ? "Watching" : "Watch"}</span>
            {bug.watchers && bug.watchers.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 font-mono">
                {bug.watchers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Bug Lifecycle Action Bar (Developer / Super Admin) ── */}
      {canDevelop && (
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Current State:</span>
            <BugzillaStatusBadge status={bug.status} />
            {bug.resolution && (
              <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                Resolution: {bug.resolution}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {bug.status !== "IN PROGRESS" && bug.status !== "RESOLVED" && bug.status !== "CLOSED" && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("IN PROGRESS")}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5" />
                Start Progress
              </button>
            )}

            {bug.status !== "RESOLVED" && bug.status !== "CLOSED" && (
              <button
                type="button"
                onClick={() => setResolveDialogOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Resolve Bug
              </button>
            )}

            {bug.status === "RESOLVED" && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("VERIFIED")}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                Verify Fix
              </button>
            )}

            {bug.status !== "CLOSED" && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("CLOSED")}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-800 text-white transition-colors cursor-pointer shadow-2xs"
              >
                <XCircle className="w-3.5 h-3.5" />
                Close Bug
              </button>
            )}

            {(bug.status === "RESOLVED" || bug.status === "CLOSED" || bug.status === "VERIFIED") && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("REOPENED")}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reopen Bug
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Main Layout: 2 Columns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column (Main Tabs: Details, Comments, History, Attachments, Dependencies) ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs bar */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "details"
                  ? "bg-rose-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              Defect Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("comments")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "comments"
                  ? "bg-rose-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Comments ({comments.length || (activeTab === "comments" ? 0 : "")})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("attachments")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "attachments"
                  ? "bg-rose-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" />
              Attachments
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dependencies")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "dependencies"
                  ? "bg-rose-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              Dependencies
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "history"
                  ? "bg-rose-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Audit Log
            </button>
          </div>

          {/* Tab 1: Details */}
          {activeTab === "details" && (
            <div className="space-y-4">
              {/* Description Box */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Description
                </h3>
                <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {bug.description || <span className="italic text-slate-400">No description provided.</span>}
                </div>
              </div>

              {/* Reproduction Details (Editable by Reporter/Developer) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Steps to Reproduce & Results
                  </h3>
                  {canEditReporterFields && !isEditingRepro && (
                    <button
                      type="button"
                      onClick={() => setIsEditingRepro(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Reproduction Info
                    </button>
                  )}
                </div>

                {isEditingRepro ? (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Steps to Reproduce
                      </label>
                      <textarea
                        rows={4}
                        value={editSteps}
                        onChange={(e) => setEditSteps(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Expected Result
                        </label>
                        <textarea
                          rows={3}
                          value={editExpected}
                          onChange={(e) => setEditExpected(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Actual Result
                        </label>
                        <textarea
                          rows={3}
                          value={editActual}
                          onChange={(e) => setEditActual(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingRepro(false)}
                        className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveRepro}
                        disabled={savingRepro}
                        className="px-4 py-1.5 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors"
                      >
                        {savingRepro ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 mb-1">Steps:</div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                        {bug.steps_to_reproduce || <span className="italic text-slate-400 font-sans">No reproduction steps given.</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 mb-1">Expected Result:</div>
                        <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs text-slate-800 dark:text-slate-200">
                          {bug.expected_result || <span className="italic text-slate-400">Unspecified</span>}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 mb-1">Actual Result:</div>
                        <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-xs text-slate-800 dark:text-slate-200">
                          {bug.actual_result || <span className="italic text-slate-400">Unspecified</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Environment Information */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Target Environment & Hardware
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">OS / Environment</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {bug.environment || "Not specified"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Browser</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {bug.browser || "Not specified"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Device</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {bug.device || "Not specified"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Comments */}
          {activeTab === "comments" && (
            <div className="space-y-4">
              {/* Comment submission form */}
              {(canReport || canDevelop) && (
                <form onSubmit={handleAddComment} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Add Comment or Triage Note
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={commentIsPrivate}
                        onChange={(e) => setCommentIsPrivate(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <Lock className="w-3 h-3 text-amber-500" />
                      <span>Internal / Private Note</span>
                    </label>
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Write a comment or diagnosis note..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submittingComment ? "Posting…" : "Post Comment"}
                    </button>
                  </div>
                </form>
              )}

              {/* Comments stream */}
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    No comments yet. Be the first to leave a comment.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        c.is_private
                          ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            {c.user ? c.user.first_name[0] : "U"}
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {c.user ? `${c.user.first_name} ${c.user.last_name}` : "Unknown"}
                          </span>
                          {c.is_private && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.2 rounded-full">
                              <Lock className="w-2.5 h-2.5" /> Private
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap pl-8">
                        {c.comment}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Attachments */}
          {activeTab === "attachments" && (
            <div className="space-y-4">
              {(canReport || canDevelop) && (
                <form onSubmit={handleUploadAttachment} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Upload New Attachment
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      required
                      className="text-xs file:mr-3 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 dark:file:bg-rose-950/60 dark:file:text-rose-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Optional file description…"
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={uploadingAttachment || !uploadFile}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
                    >
                      {uploadingAttachment ? "Uploading…" : "Upload"}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {attachments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    No attachments uploaded for this defect.
                  </div>
                ) : (
                  attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <a
                            href={att.file_url || att.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                          >
                            {att.original_name}
                          </a>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{att.file_size ? Math.round(att.file_size / 1024) : 0} KB</span>
                            <span>•</span>
                            <span>{new Date(att.created_at).toLocaleDateString()}</span>
                            {att.description && (
                              <>
                                <span>•</span>
                                <span className="italic">{att.description}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {canDevelop && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(att.id)}
                          className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                          title="Delete attachment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Dependencies */}
          {activeTab === "dependencies" && (
            <div className="space-y-4">
              {canDevelop && (
                <form onSubmit={handleAddDependency} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Link Bug Dependency
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <select
                      value={depType}
                      onChange={(e) => setDepType(e.target.value as any)}
                      className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="depends_on">This bug depends on</option>
                      <option value="blocks">This bug blocks</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Target Bug # or ID (e.g. BZ-000002)"
                      value={depBugNumberOrId}
                      onChange={(e) => setDepBugNumberOrId(e.target.value)}
                      required
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    />

                    <button
                      type="submit"
                      disabled={addingDep || !depBugNumberOrId.trim()}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
                    >
                      {addingDep ? "Linking…" : "Add Dependency"}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {dependencies.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    No linked dependencies or blockers.
                  </div>
                ) : (
                  dependencies.map((dep) => (
                    <div
                      key={dep.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {dep.relationship_type.replace("_", " ")}
                        </span>
                        <Link
                          href={`/project-management/bugsmart/bugs/${dep.depends_on_bug_id}`}
                          className="font-mono font-bold text-rose-600 hover:underline"
                        >
                          {dep.depends_on_bug?.bug_number || `Bug #${dep.depends_on_bug_id}`}
                        </Link>
                        <span className="text-slate-700 dark:text-slate-300 truncate">
                          {dep.depends_on_bug?.summary}
                        </span>
                        {dep.depends_on_bug && (
                          <BugzillaStatusBadge status={dep.depends_on_bug.status} size="sm" />
                        )}
                      </div>

                      {canDevelop && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDependency(dep.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Remove dependency"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 5: History Audit */}
          {activeTab === "history" && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Complete Modification Audit Log
              </h3>

              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No modifications logged yet.</div>
                ) : (
                  history.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                          <span>{h.user ? `${h.user.first_name} ${h.user.last_name}` : "System"}</span>
                          <span className="font-normal text-slate-400">•</span>
                          <span className="font-mono text-rose-600 dark:text-rose-400">{h.action}</span>
                          {h.field && <span className="text-slate-500">({h.field})</span>}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(h.created_at).toLocaleString()}
                        </span>
                      </div>
                      {(h.old_value || h.new_value) && (
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 pt-1">
                          <span className="line-through text-red-500">{h.old_value || "null"}</span>
                          <span className="mx-1.5">→</span>
                          <span className="text-emerald-500 font-bold">{h.new_value || "null"}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column: Triage Attributes Sidebar ── */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-2">
              Defect Attributes
            </h3>

            {/* Severity */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Severity</span>
              {canDevelop ? (
                <select
                  value={bug.severity}
                  onChange={(e) => handleInlineUpdate({ severity: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="BLOCKER">BLOCKER</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="MAJOR">MAJOR</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="MINOR">MINOR</option>
                  <option value="TRIVIAL">TRIVIAL</option>
                </select>
              ) : (
                <BugzillaSeverityBadge severity={bug.severity} />
              )}
            </div>

            {/* Priority */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Priority</span>
              {canDevelop ? (
                <select
                  value={bug.priority}
                  onChange={(e) => handleInlineUpdate({ priority: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="P1">P1 — Immediate</option>
                  <option value="P2">P2 — High</option>
                  <option value="P3">P3 — Normal</option>
                  <option value="P4">P4 — Low</option>
                  <option value="P5">P5 — Lowest</option>
                </select>
              ) : (
                <BugzillaPriorityBadge priority={bug.priority} />
              )}
            </div>

            {/* Assignee */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Assignee</span>
              {canDevelop ? (
                <select
                  value={bug.assignee_id || ""}
                  onChange={(e) =>
                    handleInlineUpdate({ assignee_id: e.target.value ? Number(e.target.value) : null })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {projectMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} {m.pivot?.project_role ? `(${m.pivot.project_role})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {bug.assignee ? `${bug.assignee.first_name} ${bug.assignee.last_name}` : "Unassigned"}
                </div>
              )}
            </div>

            {/* Component */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Component</span>
              {canDevelop ? (
                <select
                  value={bug.component_id || ""}
                  onChange={(e) =>
                    handleInlineUpdate({ component_id: e.target.value ? Number(e.target.value) : null })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">No Component</option>
                  {components.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-slate-800 dark:text-slate-200">
                  {bug.component?.name || "None"}
                </div>
              )}
            </div>

            {/* Reporter (Read-only server invariant) */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Reporter</span>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {bug.reporter ? `${bug.reporter.first_name} ${bug.reporter.last_name}` : "Unknown"}
              </div>
            </div>

            {/* Timestamps */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div>
                Reported: <strong className="text-slate-600 dark:text-slate-300">{new Date(bug.created_at).toLocaleString()}</strong>
              </div>
              <div>
                Last Updated: <strong className="text-slate-600 dark:text-slate-300">{new Date(bug.updated_at).toLocaleString()}</strong>
              </div>
              {bug.resolved_at && (
                <div>
                  Resolved: <strong className="text-emerald-600">{new Date(bug.resolved_at).toLocaleString()}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Resolve Bug Modal ── */}
      {resolveDialogOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Resolve Defect</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select the resolution code for {bug.bug_number}.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Resolution Code
              </label>
              <select
                value={selectedResolution}
                onChange={(e) => setSelectedResolution(e.target.value as BugzillaResolution)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              >
                {RESOLUTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolveDialogOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus("RESOLVED", selectedResolution)}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                Confirm Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
