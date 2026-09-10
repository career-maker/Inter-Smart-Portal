"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Rocket,
  X,
  Calendar,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Portal } from "@/components/ui/portal";
import pmApi from "@/services/pm";
import { Project } from "@/types/pm";

interface MarkLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSuccess: (updatedProject: Project) => void;
}

export function MarkLiveModal({
  isOpen,
  onClose,
  project,
  onSuccess,
}: MarkLiveModalProps) {
  const [liveDate, setLiveDate] = useState<string>(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [liveNotes, setLiveNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("side-popup-open");
    } else {
      document.body.classList.remove("side-popup-open");
    }
    return () => {
      document.body.classList.remove("side-popup-open");
    };
  }, [isOpen]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await pmApi.markProjectLive(project.id, {
        live_date: liveDate,
        live_notes: liveNotes.trim() || undefined,
      });

      if (res.data) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to mark project as Made Live", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to mark project as Made Live."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[99999] overflow-hidden font-sans"
        data-side-popup="true"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={onClose}
        />

        {/* Side Drawer Panel */}
        <div
          className="fixed inset-y-0 right-0 max-w-lg w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-[99999] animate-in slide-in-from-right duration-300"
          data-side-popup="true"
          style={{ fontFamily: '"Proxima Nova", sans-serif' }}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-white dark:from-slate-800/80 dark:via-slate-900 dark:to-slate-900 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-[#56348f] dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-xs">
                <Rocket className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Mark Project as Made Live
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-sm">
                  {project.name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body & Footer */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-[#56348f] dark:text-purple-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Production Live Milestone</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[13px] leading-[18px]">
                  Marking this project as <strong>Made Live</strong> records the official launch date and sets its core status to <strong>Completed</strong>. Team members can continue creating and working on post-launch tasks, client warranty items, and after-live tests without restrictions.
                </p>
              </div>

              {/* Live Date Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Official Go-Live Date</span>
                </label>
                <input
                  type="date"
                  required
                  value={liveDate}
                  onChange={(e) => setLiveDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Release / Deployment Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Go-Live Notes / URL / Scope Summary (Optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={liveNotes}
                  onChange={(e) => setLiveNotes(e.target.value)}
                  placeholder="e.g. Launched to production URL https://..., signed off by client, staging moved to maintenance mode."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>

            {/* Sticky Footer Actions */}
            <div className="p-4 px-6 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: "13px",
                  lineHeight: "20px",
                  fontWeight: 400,
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[13px] leading-[20px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  backgroundColor: "var(--portal-primary-color, #0F766E)",
                  color: "rgb(255, 255, 255)",
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: "13px",
                  lineHeight: "20px",
                  fontWeight: 400,
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--portal-primary-color,#0F766E)] hover:bg-[var(--portal-hover-color,#138A80)] !text-white text-[13px] leading-[20px] shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin !text-white" />
                    <span className="!text-white">Marking Live...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 !text-white" />
                    <span className="!text-white">Confirm Made Live</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
