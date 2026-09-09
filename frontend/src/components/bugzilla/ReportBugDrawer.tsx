"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bug,
  X,
  Plus,
  Loader2,
  AlertCircle,
  Upload,
  CheckCircle2,
  ExternalLink,
  Link2,
  CheckSquare,
  Building2,
  FolderKanban,
  Layers,
} from "lucide-react";
import { bugzillaApi } from "@/services/bugzilla";
import pmApi from "@/services/pm";
import {
  BugzillaSeverity,
  BugzillaPriority,
  DuplicateCandidate,
} from "@/types/bugzilla";
import { Project, ProjectTask } from "@/types/pm";
import { BugzillaStatusBadge } from "@/components/bugzilla/BugzillaStatusBadge";
import { useAuthStore } from "@/store/auth";

// In-memory session cache: preserved across modal open/close until the page is refreshed
let inMemoryProjectId: number | "" = "";
let inMemoryTaskId: number | "" = "";

export function openReportBugDrawer(projectId?: number, taskId?: number) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("open-report-bug-drawer", { detail: { projectId, taskId } })
    );
  }
}

interface ReportBugDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: (createdBug: any) => void;
  defaultProjectId?: number | "";
  defaultTaskId?: number | "";
}

export function ReportBugDrawer({
  isOpen = false,
  onClose,
  onSuccess,
  defaultProjectId,
  defaultTaskId,
}: ReportBugDrawerProps) {
  const { user } = useAuthStore();

  const [internalOpen, setInternalOpen] = useState(false);
  const [eventProjectId, setEventProjectId] = useState<number | "">("");
  const [eventTaskId, setEventTaskId] = useState<number | "">("");

  const effectiveOpen = isOpen || internalOpen;

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.projectId) setEventProjectId(e.detail.projectId);
      if (e.detail?.taskId) setEventTaskId(e.detail.taskId);
      setInternalOpen(true);
    };
    window.addEventListener("open-report-bug-drawer", handler);
    return () => window.removeEventListener("open-report-bug-drawer", handler);
  }, []);

  const handleClose = () => {
    setInternalOpen(false);
    setEventProjectId("");
    setEventTaskId("");
    if (onClose) onClose();
  };

  // Projects & Tasks state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Form Fields
  const [portalProjectId, setPortalProjectId] = useState<number | "">("");
  const [taskId, setTaskId] = useState<number | "">("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [environment, setEnvironment] = useState("");
  const [browser, setBrowser] = useState("");
  const [device, setDevice] = useState("");
  const [severity, setSeverity] = useState<BugzillaSeverity>("NORMAL");
  const [priority, setPriority] = useState<BugzillaPriority>("P3");
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");

  // Attachment URLs
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");

  // Duplicate detection state
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load Projects on initial mount
  useEffect(() => {
    let isMounted = true;
    setLoadingProjects(true);

    pmApi
      .getProjects({ all: true } as any)
      .then((res: any) => {
        if (!isMounted) return;
        const list = res.data || (Array.isArray(res) ? res : []);
        setProjects(list);
      })
      .catch((e) => console.warn("Failed to load projects for Report Bug drawer", e))
      .finally(() => {
        if (isMounted) setLoadingProjects(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // When Drawer opens, initialize or restore pre-filled project and task until page refresh
  useEffect(() => {
    if (!effectiveOpen) return;

    setError(null);
    setSuccessMsg(null);

    // Resolution order: Event detail -> Explicit Prop -> In-memory session cache -> Blank
    const initialPId = eventProjectId || defaultProjectId || inMemoryProjectId || "";
    const initialTId = eventTaskId || defaultTaskId || inMemoryTaskId || "";

    if (initialPId) {
      setPortalProjectId(initialPId);
      inMemoryProjectId = initialPId;
    }
    if (initialTId) {
      setTaskId(initialTId);
      inMemoryTaskId = initialTId;
    }
  }, [effectiveOpen, defaultProjectId, defaultTaskId, eventProjectId, eventTaskId]);

  // When selected project changes, fetch its corresponding tasks
  useEffect(() => {
    if (!portalProjectId) {
      setTasks([]);
      setTaskId("");
      return;
    }

    let isMounted = true;
    setLoadingTasks(true);

    pmApi
      .getTasks({ project_id: Number(portalProjectId), per_page: 100 })
      .then((res: any) => {
        if (!isMounted) return;
        const taskList: ProjectTask[] = res.data || (Array.isArray(res) ? res : []);
        setTasks(taskList);

        // Pre-fill task if in memory or event/prop and belongs to this project
        const targetTaskId = eventTaskId || defaultTaskId || inMemoryTaskId;
        if (targetTaskId && taskList.some((t) => t.id === Number(targetTaskId))) {
          setTaskId(Number(targetTaskId));
          inMemoryTaskId = Number(targetTaskId);
        } else if (taskList.length === 1) {
          // If project has only 1 task, auto-select it
          setTaskId(taskList[0].id);
          inMemoryTaskId = taskList[0].id;
        }
      })
      .catch((e) => {
        console.warn("Failed to load project tasks", e);
        if (isMounted) setTasks([]);
      })
      .finally(() => {
        if (isMounted) setLoadingTasks(false);
      });

    return () => {
      isMounted = false;
    };
  }, [portalProjectId, defaultTaskId, eventTaskId]);

  // Live duplicate detection
  useEffect(() => {
    if (!summary || summary.trim().length < 5) {
      setDuplicateCandidates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      try {
        const res = await bugzillaApi.checkDuplicates(summary.trim(), portalProjectId ? Number(portalProjectId) : undefined);
        const dups = res.data || (res as any).duplicates || [];
        setDuplicateCandidates(dups);
      } catch (e) {
        console.warn("Failed duplicate check", e);
      } finally {
        setCheckingDuplicates(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [summary, portalProjectId]);

  // Add label / tag
  const handleAddLabel = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && labelInput.trim()) {
      e.preventDefault();
      const val = labelInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (val && !labels.includes(val)) {
        setLabels([...labels, val]);
      }
      setLabelInput("");
    }
  };

  const handleRemoveLabel = (lbl: string) => {
    setLabels(labels.filter((l) => l !== lbl));
  };

  // Handle Attachment URLs
  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      if (!attachmentUrls.includes(trimmed)) {
        setAttachmentUrls([...attachmentUrls, trimmed]);
      }
      setUrlInput("");
    }
  };

  const handleRemoveUrl = (idx: number) => {
    setAttachmentUrls(attachmentUrls.filter((_, i) => i !== idx));
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!portalProjectId) {
      setError("Please select a Project.");
      return;
    }

    if (!taskId) {
      setError("Please select a Task. Task selection is mandatory.");
      return;
    }

    if (!summary.trim()) {
      setError("Please provide a defect summary.");
      return;
    }

    if (!description.trim()) {
      setError("Please provide a defect description.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        portal_project_id: Number(portalProjectId),
        task_id: Number(taskId),
        summary: summary.trim(),
        description: description.trim(),
        severity,
        priority,
        status: "NEW",
      };

      if (stepsToReproduce.trim()) payload.steps_to_reproduce = stepsToReproduce.trim();
      if (expectedResult.trim()) payload.expected_result = expectedResult.trim();
      if (actualResult.trim()) payload.actual_result = actualResult.trim();
      if (environment.trim()) payload.environment = environment.trim();
      if (browser.trim()) payload.browser = browser.trim();
      if (device.trim()) payload.device = device.trim();
      if (labels.length > 0) payload.labels = labels;
      if (attachmentUrls.length > 0) payload.attachment_urls = attachmentUrls;

      const res = await bugzillaApi.createBug(payload);
      const newBug = res.data || res;

      // Preserve selected Project & Task in session cache for next bug report until page refresh!
      inMemoryProjectId = Number(portalProjectId);
      inMemoryTaskId = Number(taskId);

      setSuccessMsg(`Defect ${newBug?.bug_number || "report"} filed successfully!`);

      // Reset form fields while PRESERVING pre-filled project & task
      setSummary("");
      setDescription("");
      setStepsToReproduce("");
      setExpectedResult("");
      setActualResult("");
      setAttachmentUrls([]);
      setUrlInput("");
      setLabels([]);

      if (onSuccess) {
        onSuccess(newBug);
      }

      // Close drawer after short delay
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err: any) {
      console.error("Failed to report bug", err);
      setError(err?.response?.data?.message || err?.message || "Failed to submit defect report.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!effectiveOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* ── Drawer Header ── */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-50/70 via-white to-white dark:from-rose-950/30 dark:via-slate-900 dark:to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-xs shrink-0">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Report Defect</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  BugSmart
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log a software bug under an assigned task. Project and Task remain pre-filled for consecutive reports.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Form Content ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section: Project & Mandatory Task */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FolderKanban className="w-4 h-4 text-rose-600" />
              <span>Project & Assigned Task</span>
            </h3>

            <div className="space-y-3">
              {/* Project Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={portalProjectId}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : "";
                    setPortalProjectId(val);
                    inMemoryProjectId = val;
                  }}
                  required
                  disabled={loadingProjects}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="">Select Project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} #{p.id} {p.team ? `(${p.team.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Select: Only visible/enabled once a Project is selected, and MANDATORY */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>
                    Task <span className="text-red-500">*</span>
                  </span>
                  {loadingTasks && (
                    <span className="text-[10px] text-rose-600 flex items-center gap-1 font-normal">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading tasks…
                    </span>
                  )}
                </label>

                {!portalProjectId ? (
                  <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-400 italic">
                    Please select a project first to choose a task.
                  </div>
                ) : (
                  <>
                    <select
                      value={taskId}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : "";
                        setTaskId(val);
                        inMemoryTaskId = val;
                      }}
                      required
                      disabled={loadingTasks}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="">Select Task (Mandatory)…</option>
                      {tasks.map((t) => {
                        const isMyTask = user?.id && t.assignees?.some((a) => a.id === user.id);
                        const assigneesText =
                          t.assignees && t.assignees.length > 0
                            ? t.assignees.map((a) => `${a.first_name} ${a.last_name}`).join(", ")
                            : "Unassigned";
                        return (
                          <option key={t.id} value={t.id}>
                            #{t.id} - {t.title} [{t.status}] (Assigned: {assigneesText}){isMyTask ? " ★ (Assigned to You)" : ""}
                          </option>
                        );
                      })}
                    </select>
                    {tasks.length === 0 && !loadingTasks && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                        No tasks found under this project. Tasks assigned by Team Leads will appear here.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Section: Defect Details */}
          <div className="space-y-4">
            {/* Summary */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Defect Summary / Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
                placeholder="Clear, descriptive one-line summary of the defect…"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* Live Duplicate Warning */}
            {checkingDuplicates && (
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-rose-500" />
                <span>Checking for potential duplicate defects…</span>
              </div>
            )}

            {duplicateCandidates.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Potential Duplicate Bugs Detected:</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {duplicateCandidates.map((dup) => (
                    <div
                      key={dup.id}
                      className="text-xs flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white/70 dark:bg-slate-900/60"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          {dup.bug_number}
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 truncate">{dup.summary}</span>
                        <BugzillaStatusBadge status={dup.status} size="sm" />
                      </div>
                      <Link
                        href={`/project-management/bugsmart/bugs/${dup.id}`}
                        target="_blank"
                        className="text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-0.5 text-[11px] shrink-0 font-medium"
                      >
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Severity & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Severity <span className="text-red-500">*</span>
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as BugzillaSeverity)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="BLOCKER">BLOCKER (System unusable)</option>
                  <option value="CRITICAL">CRITICAL (Crashes, data loss)</option>
                  <option value="MAJOR">MAJOR (Major feature broken)</option>
                  <option value="NORMAL">NORMAL (Default)</option>
                  <option value="MINOR">MINOR (Minor inconvenience)</option>
                  <option value="TRIVIAL">TRIVIAL (Cosmetic/typo)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as BugzillaPriority)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="P1">P1 (Immediate Fix)</option>
                  <option value="P2">P2 (High Priority)</option>
                  <option value="P3">P3 (Normal)</option>
                  <option value="P4">P4 (Low)</option>
                  <option value="P5">P5 (Lowest)</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Comprehensive details explaining the issue, user workflow, and impact…"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* Steps to Reproduce */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Steps to Reproduce
              </label>
              <textarea
                rows={2}
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
                placeholder={"1. Navigate to...\n2. Click button...\n3. Observe error..."}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {/* Expected vs Actual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expected Result
                </label>
                <textarea
                  rows={2}
                  value={expectedResult}
                  onChange={(e) => setExpectedResult(e.target.value)}
                  placeholder="What should have happened…"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Actual Result
                </label>
                <textarea
                  rows={2}
                  value={actualResult}
                  onChange={(e) => setActualResult(e.target.value)}
                  placeholder="What actually occurred…"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Environment Info */}
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Environment (e.g. Staging, Prod)"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />
              <input
                type="text"
                placeholder="Browser (e.g. Chrome 124)"
                value={browser}
                onChange={(e) => setBrowser(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />
              <input
                type="text"
                placeholder="Device / OS (e.g. Windows 11)"
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {/* Attachment URLs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Attachment URLs (Loom, Drive, Figma, Screenshots)</span>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddUrl();
                      }
                    }}
                    placeholder="Paste URL (e.g. Loom video, Google Drive, screenshot link)…"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddUrl}
                  disabled={!urlInput.trim()}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                >
                  + Add URL
                </button>
              </div>

              {attachmentUrls.length > 0 && (
                <div className="space-y-1.5 mt-2.5">
                  {attachmentUrls.map((link, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        <ExternalLink className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-rose-600 dark:text-rose-400 hover:underline font-medium"
                        >
                          {link}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveUrl(idx)}
                        className="text-slate-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                        title="Remove URL"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* ── Action Footer ── */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !summary.trim() || !portalProjectId || !taskId}
            className="inline-flex items-center gap-2 px-6 py-2 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 shadow-sm transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Filing Defect…
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Submit Defect
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
