"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import {
  Database,
  HardDrive,
  Calendar,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  RefreshCw,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  Layers,
  Save,
  HelpCircle,
  FileCheck
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function StorageRetentionAddonPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const isSuperAdmin = (user?.role || "").toLowerCase() === "super admin";

  const [chatDays, setChatDays] = useState(30);
  const [postDays, setPostDays] = useState(30);
  const [autoCleanup, setAutoCleanup] = useState(true);
  const [lastCleanupAt, setLastCleanupAt] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/storage-settings?t=${Date.now()}`);
      if (res.data?.status === "success") {
        const d = res.data.data;
        setChatDays(d.chat_retention_days ?? 30);
        setPostDays(d.community_posts_retention_days ?? 30);
        setAutoCleanup(d.auto_cleanup_enabled ?? true);
        setLastCleanupAt(d.last_cleanup_at || null);
        setStats(d.stats || null);
      }
    } catch (err: any) {
      console.error("Failed to load storage settings", err);
      setToastMessage({ type: "error", text: "Failed to load storage settings." });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.post("/storage-settings", {
        chat_retention_days: Number(chatDays),
        community_posts_retention_days: Number(postDays),
        auto_cleanup_enabled: autoCleanup,
      });

      if (res.data?.status === "success") {
        setToastMessage({ type: "success", text: "Storage retention settings saved successfully!" });
        fetchSettings();
      }
    } catch (err: any) {
      console.error("Failed to save settings", err);
      setToastMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to save settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCleanupNow = async () => {
    try {
      setCleaning(true);
      setShowCleanupModal(false);
      const res = await api.post("/storage-settings/cleanup-now");
      if (res.data?.status === "success") {
        setToastMessage({
          type: "success",
          text: res.data.message || "Manual cleanup completed successfully!",
        });
        fetchSettings();
      }
    } catch (err: any) {
      console.error("Failed to execute cleanup", err);
      setToastMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to perform cleanup.",
      });
    } finally {
      setCleaning(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Access Denied</h2>
        <p className="text-xs text-slate-500 mt-1">
          This storage management tool is restricted to Super Admins.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: '"Google Sans", "Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="pb-16 max-w-5xl mx-auto space-y-6"
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/project-management/addons"
            className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Add-on Module
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="text-xs text-slate-500 font-medium">Data Lifecycle</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-2">
              <HardDrive className="w-6 h-6 text-[#56348f]" />
              Storage & Data Retention Policy
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSettings()}
            disabled={loading || cleaning}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Stats</span>
          </button>
        </div>
      </div>

      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div
          className={`p-3.5 px-5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── STATS OVERVIEW CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chat Messages */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#56348f]" />
              Chat Messages
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {stats?.total_chat_messages ?? 0}
            </span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-2">
            {stats?.eligible_chat_messages ?? 0}{" "}
            <span className="text-xs font-normal text-rose-500">eligible for deletion</span>
          </p>
          <p className="text-[10.5px] text-slate-400 mt-1 truncate">
            Cutoff: Older than {stats?.chat_retention_cutoff ?? `${chatDays} days`}
          </p>
        </div>

        {/* Community Posts */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Community Posts
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {stats?.total_community_posts ?? 0}
            </span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-2">
            {stats?.eligible_community_posts ?? 0}{" "}
            <span className="text-xs font-normal text-rose-500">eligible for deletion</span>
          </p>
          <p className="text-[10.5px] text-slate-400 mt-1 truncate">
            Cutoff: Older than {stats?.community_posts_cutoff ?? `${postDays} days`}
          </p>
        </div>

        {/* Chat Attachments Size */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-sky-600" />
              Attached Media
            </span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-2">
            {stats?.chat_attachments_size_mb ?? 0} <span className="text-xs font-normal text-slate-500">MB</span>
          </p>
          <p className="text-[10.5px] text-slate-400 mt-1">
            Screenshots & document files on disk
          </p>
        </div>

        {/* Last Cleanup Status */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              Last Cleanup Run
            </span>
          </div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">
            {lastCleanupAt ? format(parseISO(lastCleanupAt), "dd MMM yyyy, h:mm a") : "Never run yet"}
          </p>
          <p className="text-[10.5px] text-emerald-600 font-medium mt-1">
            {autoCleanup ? "Auto-cleanup active" : "Manual cleanup only"}
          </p>
        </div>
      </div>

      {/* ── CONFIGURATION FORM ── */}
      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Retention Policies
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure how long chat messages and community posts remain stored before they are permanently purged from the database and disk.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Chat History Retention */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Direct Chat History Retention</span>
              <span className="text-[11px] font-mono text-purple-600 font-bold bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md">
                {chatDays} Days
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="365"
                value={chatDays}
                onChange={(e) => setChatDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-28 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-xs text-slate-500">
                Messages and uploaded screenshots older than {chatDays} days will be deleted.
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {[7, 14, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setChatDays(d)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    chatDays === d
                      ? "bg-[#56348f] text-white border-[#56348f]"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>

          {/* Community Posts Retention */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Community Feed Posts Retention</span>
              <span className="text-[11px] font-mono text-purple-600 font-bold bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md">
                {postDays} Days
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="365"
                value={postDays}
                onChange={(e) => setPostDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-28 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-xs text-slate-500">
                Community feed posts, comments, and media older than {postDays} days will be deleted.
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {[7, 14, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPostDays(d)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    postDays === d
                      ? "bg-[#56348f] text-white border-[#56348f]"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Auto-cleanup Switch & Safeguard note */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-[#56348f] dark:text-purple-300 rounded-xl mt-0.5">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Automated Daily Cleanup
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                When enabled, the portal automatically prunes only expired chat history and community posts.
                <b> All other company data (employees, attendance logs, leave balances, projects, tasks) is 100% protected and never touched.</b>
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoCleanup}
              onChange={(e) => setAutoCleanup(e.target.checked)}
              className="w-4 h-4 text-[#56348f] rounded-md focus:ring-purple-500 border-slate-300"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Enable Auto-Cleanup
            </span>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowCleanupModal(true)}
            disabled={cleaning}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clean Up Expired Data Now</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#56348f] hover:bg-[#452875] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer hover:shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Retention Settings"}</span>
          </button>
        </div>
      </form>

      {/* ── MANUAL CLEANUP CONFIRMATION MODAL ── */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Confirm Manual Storage Cleanup
              </h3>
              <p className="text-xs text-slate-500 mt-1.5">
                This will permanently delete:
              </p>
              <ul className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2 space-y-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-left list-disc list-inside">
                <li>
                  <b>{stats?.eligible_chat_messages ?? 0}</b> chat messages older than {chatDays} days
                </li>
                <li>
                  <b>{stats?.eligible_community_posts ?? 0}</b> community posts older than {postDays} days
                </li>
                <li>All associated screenshots and photo attachments on disk</li>
              </ul>
              <p className="text-[11px] text-slate-400 mt-2 italic">
                All employee profiles, attendance, leaves, and projects remain 100% safe.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCleanupModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCleanupNow}
                disabled={cleaning}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{cleaning ? "Purging..." : "Confirm & Clean Up"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
