"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { MessageSquare, Send, Loader2, User, AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import pmApi from "@/services/pm";
import { ProjectTaskComment } from "@/types/pm";

interface TaskCommentsProps {
  taskId: number;
}

function formatRelativeCommentTime(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr);
    const distance = formatDistanceToNow(parsed, { addSuffix: true });
    const fullDate = format(parsed, "dd MMM yyyy, h:mm a");
    return `${distance} (${fullDate})`;
  } catch {
    return dateStr;
  }
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<ProjectTaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await pmApi.getTaskComments(taskId);
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw as any)?.data || [];
      // Sort in chronological order (oldest first, newest at the bottom of the thread)
      const sorted = [...list].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setComments(sorted);
    } catch (err: any) {
      console.warn("Failed to load task comments", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load discussion.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await pmApi.addTaskComment(taskId, { comment: newComment.trim() });
      setNewComment("");
      await fetchComments(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to post comment. Please check authorization.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Discussion & Activity ({comments.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time activity log, status updates, and peer notes
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchComments(true)}
          disabled={refreshing || loading}
          aria-label="Refresh Comments"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          title="Refresh discussion"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
        </button>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchComments(true)}
            className="text-xs font-semibold underline hover:no-underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Comments Feed (Chronological) ── */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span>Loading task discussion…</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-10 text-center rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No comments posted yet
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              Be the first to share an update, report a milestone, or ask a question regarding this task.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => {
              const isCurrentUser = user && c.user_id === user.id;

              return (
                <div
                  key={c.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrentUser
                      ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-800/50"
                      : "bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-800/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                          isCurrentUser
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {c.user?.first_name?.[0] || "U"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {c.user ? `${c.user.first_name} ${c.user.last_name}` : "User"}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                            You
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      {formatRelativeCommentTime(c.created_at)}
                    </span>
                  </div>

                  {/* Comment Body (XSS-safe escaped text) */}
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line pl-9 leading-relaxed">
                    {c.comment}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Comment Composer ── */}
      <form onSubmit={handleSubmit} className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Add Comment / Update
          </label>
          <textarea
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={submitting}
            placeholder="Write a message or update... (Press Ctrl + Enter to post)"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] border border-slate-200 dark:border-slate-700">Ctrl + Enter</kbd> to submit
          </span>

          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-blue-500/20 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Posting…</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Post Comment</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
