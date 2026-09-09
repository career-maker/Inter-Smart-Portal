"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bug,
  AlertTriangle,
  ArrowLeft,
  Upload,
  X,
  FileText,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Layers,
  HelpCircle,
} from "lucide-react";
import { bugzillaApi } from "@/services/bugzilla";
import { pmApi } from "@/services/pm";
import {
  BugzillaProject,
  BugzillaComponent,
  BugzillaSeverity,
  BugzillaPriority,
  DuplicateCandidate,
} from "@/types/bugzilla";
import { BugzillaStatusBadge } from "@/components/bugzilla/BugzillaStatusBadge";
import { useBugzillaAuth } from "@/hooks/useBugzillaAuth";
import { PageLoader } from "@/components/ui/PageLoader";

export default function NewBugzillaBugPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canReport, loading: authLoading } = useBugzillaAuth();

  // Search param hints (e.g. from Task page)
  const initialPortalProjectId = searchParams.get("portal_project_id");
  const initialTaskId = searchParams.get("task_id");

  // State
  const [projects, setProjects] = useState<BugzillaProject[]>([]);
  const [components, setComponents] = useState<BugzillaComponent[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Form Fields
  const [portalProjectId, setPortalProjectId] = useState<number | "">(
    initialPortalProjectId ? Number(initialPortalProjectId) : ""
  );
  const [componentId, setComponentId] = useState<number | "">("");
  const [taskId, setTaskId] = useState<number | "">(initialTaskId ? Number(initialTaskId) : "");
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

  // Attachments
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Duplicate detection state
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Bugzilla mapped projects
  useEffect(() => {
    bugzillaApi
      .getProjects({ per_page: 100 })
      .then((res) => {
        setProjects(res.data || []);
        if (!portalProjectId && res.data && res.data.length > 0) {
          setPortalProjectId(res.data[0].portal_project_id);
        }
      })
      .catch((e) => console.warn("Failed to load Bugzilla projects", e))
      .finally(() => setLoadingProjects(false));
  }, []);

  // When selected project changes, fetch its components
  useEffect(() => {
    if (!portalProjectId) {
      setComponents([]);
      setComponentId("");
      return;
    }

    const matched = projects.find((p) => p.portal_project_id === portalProjectId);
    if (matched) {
      bugzillaApi
        .getComponents(matched.id)
        .then((res) => {
          setComponents(res.data || []);
          if (res.data && res.data.length > 0) {
            setComponentId(res.data[0].id);
          } else {
            setComponentId("");
          }
        })
        .catch((e) => console.warn("Failed to load components", e));
    }
  }, [portalProjectId, projects]);

  // Live duplicate detection debounced
  useEffect(() => {
    if (!summary || summary.trim().length < 5) {
      setDuplicateCandidates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      try {
        const matched = projects.find((p) => p.portal_project_id === portalProjectId);
        const res = await bugzillaApi.checkDuplicates(summary.trim(), matched?.id);
        setDuplicateCandidates(res.data || []);
      } catch (e) {
        console.warn("Failed duplicate check", e);
      } finally {
        setCheckingDuplicates(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [summary, portalProjectId, projects]);

  // Add tag
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

  // Handle files
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const arr = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...arr]);
    }
  };

  const handleRemoveFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalProjectId) {
      setError("Please select a project.");
      return;
    }
    if (!summary.trim()) {
      setError("Please provide a defect summary.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        portal_project_id: Number(portalProjectId),
        summary: summary.trim(),
        description: description.trim(),
        severity,
        priority,
        status: "NEW",
      };

      if (componentId) payload.component_id = Number(componentId);
      if (taskId) payload.task_id = Number(taskId);
      if (stepsToReproduce.trim()) payload.steps_to_reproduce = stepsToReproduce.trim();
      if (expectedResult.trim()) payload.expected_result = expectedResult.trim();
      if (actualResult.trim()) payload.actual_result = actualResult.trim();
      if (environment.trim()) payload.environment = environment.trim();
      if (browser.trim()) payload.browser = browser.trim();
      if (device.trim()) payload.device = device.trim();
      if (labels.length > 0) payload.labels = labels;

      const res = await bugzillaApi.createBug(payload);
      const newBug = res.data;

      // If files attached, upload sequentially
      if (selectedFiles.length > 0 && newBug.id) {
        for (const file of selectedFiles) {
          try {
            await bugzillaApi.uploadAttachment(newBug.id, file);
          } catch (fileErr) {
            console.warn("Attachment upload warning", fileErr);
          }
        }
      }

      router.push(`/project-management/bugzilla/bugs/${newBug.id}`);
    } catch (err: any) {
      console.error("Failed to create bug", err);
      setError(err?.response?.data?.message || err?.message || "Failed to submit defect report.");
      setSubmitting(false);
    }
  };

  if (authLoading || loadingProjects) {
    return <PageLoader />;
  }

  if (!canReport) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-3">
        <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">Reporter Capability Required</h3>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Your current capability is Viewer. You do not have permission to file new defects.
        </p>
        <Link
          href="/project-management/bugzilla/bugs"
          className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
        >
          Back to Bug Registry
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/project-management/bugzilla/bugs"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Report New Bugzilla Defect</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit an issue with rich reproduction steps, system environment, and live duplicate checking.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project & Component Mapping */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-600" />
            Project & Classification
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Portal Project */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Portal Project <span className="text-red-500">*</span>
              </label>
              <select
                value={portalProjectId}
                onChange={(e) => setPortalProjectId(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="">Select Portal Project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.portal_project_id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Automatically resolves the corresponding Bugzilla Project.
              </p>
            </div>

            {/* Component */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Component <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={componentId}
                onChange={(e) => setComponentId(e.target.value ? Number(e.target.value) : "")}
                disabled={components.length === 0}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
              >
                <option value="">{components.length === 0 ? "No components available" : "Select Component…"}</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Task Linking */}
          {taskId && (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
              <div>
                <strong>Linked Portal Task ID:</strong> #{taskId}
              </div>
              <button
                type="button"
                onClick={() => setTaskId("")}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Unlink Task
              </button>
            </div>
          )}
        </div>

        {/* Summary & Live Duplicate Detection */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Defect Summary <span className="text-red-500">*</span>
              </label>
              {checkingDuplicates && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-rose-500" />
                  Checking for duplicate bugs…
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. Checkout page throws 500 when promo code contains spaces"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          {/* Duplicate Bug Candidate Warning Box (Bugzilla Section 32) */}
          {duplicateCandidates.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Possible Duplicate Bugs Found ({duplicateCandidates.length})</span>
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                Similar bugs were found in this project. Please inspect them to prevent duplicate triage.
              </p>

              <div className="divide-y divide-amber-200/60 dark:divide-amber-800/40">
                {duplicateCandidates.map((dup) => (
                  <div key={dup.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        {dup.bug_number}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 truncate">{dup.summary}</span>
                      <BugzillaStatusBadge status={dup.status} size="sm" />
                    </div>
                    <a
                      href={`/project-management/bugzilla/bugs/${dup.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 text-[11px] shrink-0 font-medium"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Severity & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as BugzillaSeverity)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="BLOCKER">BLOCKER — Blocks deployment or core workflow</option>
                <option value="CRITICAL">CRITICAL — Severe crash or data corruption</option>
                <option value="MAJOR">MAJOR — Major feature failure with no workaround</option>
                <option value="NORMAL">NORMAL — Regular issue with workaround</option>
                <option value="MINOR">MINOR — Minor visual or non-critical flaw</option>
                <option value="TRIVIAL">TRIVIAL — Typo, cosmetic, or trivial nit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as BugzillaPriority)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="P1">P1 — Immediate fix required</option>
                <option value="P2">P2 — High priority for current sprint</option>
                <option value="P3">P3 — Normal priority</option>
                <option value="P4">P4 — Low priority</option>
                <option value="P5">P5 — Lowest / Nice-to-have</option>
              </select>
            </div>
          </div>
        </div>

        {/* Detailed Reproduction & Expectations */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Reproduction Details & Expected Behavior
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              General Description
            </label>
            <textarea
              rows={3}
              placeholder="Provide general context, user story, or circumstances of the defect..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Steps to Reproduce
            </label>
            <textarea
              rows={4}
              placeholder={"1. Navigate to /checkout\n2. Enter invalid email with whitespace\n3. Click Submit Order button"}
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expected Result
              </label>
              <textarea
                rows={3}
                placeholder="Validation error should display under email field without submitting order"
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Actual Result
              </label>
              <textarea
                rows={3}
                placeholder="Screen freezes and network tab shows HTTP 500 error"
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Environment, Browser, Device */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Environment & Hardware
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Environment / OS
              </label>
              <input
                type="text"
                placeholder="e.g. Staging, Windows 11, macOS"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Browser & Version
              </label>
              <input
                type="text"
                placeholder="e.g. Chrome 128, Safari 17"
                value={browser}
                onChange={(e) => setBrowser(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Device / Viewport
              </label>
              <input
                type="text"
                placeholder="e.g. iPhone 15 Pro, Desktop 1920x1080"
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Labels & Tags */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Labels & Tags
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {labels.map((lbl) => (
              <span
                key={lbl}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              >
                #{lbl}
                <button
                  type="button"
                  onClick={() => handleRemoveLabel(lbl)}
                  className="hover:text-rose-900 dark:hover:text-rose-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="Add tag and press Enter…"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={handleAddLabel}
              className="px-3 py-1 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Attachments Dropzone */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Attachments (Screenshots, logs, screen records)
          </label>
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-rose-400 dark:hover:border-rose-600 transition-colors">
            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Drag and drop files here or click to browse
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="bug-attachment-input"
            />
            <label
              htmlFor="bug-attachment-input"
              className="inline-block mt-3 px-4 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
            >
              Browse Files
            </label>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-1.5 pt-2">
              {selectedFiles.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300 truncate">{f.name}</span>
                    <span className="text-slate-400 text-[10px]">({Math.round(f.size / 1024)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link
            href="/project-management/bugzilla/bugs"
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !summary.trim() || !portalProjectId}
            className="inline-flex items-center gap-2 px-6 py-2 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 shadow-sm transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting Defect…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                File Bugzilla Defect
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
