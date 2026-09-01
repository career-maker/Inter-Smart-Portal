"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import {
  X,
  LifeBuoy,
  Link2,
  UploadCloud,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";

const CATEGORIES = [
  "Technical Issue",
  "Attendance Issue",
  "Leave Issue",
  "Payroll Issue",
  "HR Concern",
  "Portal Bug",
  "Feature Request",
  "General Query",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const MODULES = [
  "Attendance",
  "Leave",
  "Dashboard",
  "Announcements",
  "Profile",
  "Tasks",
  "Hubstaff",
  "Others",
];

interface RaiseIssueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onIssueCreated?: (newIssue: any) => void;
}

export function RaiseIssueDrawer({
  isOpen,
  onClose,
  onIssueCreated,
}: RaiseIssueDrawerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successIssue, setSuccessIssue] = useState<any | null>(null);

  const [attachMode, setAttachMode] = useState<"url" | "file">("url");
  const [files, setFiles] = useState<File[]>([]);
  const [attachmentLink, setAttachmentLink] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    priority: "Medium",
    related_module: "",
    description: "",
  });

  if (!isOpen) return null;

  const resetForm = () => {
    setFormData({
      title: "",
      category: "",
      priority: "Medium",
      related_module: "",
      description: "",
    });
    setFiles([]);
    setAttachmentLink("");
    setErrorMsg(null);
    setSuccessIssue(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMsg) setErrorMsg(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMsg("Please provide an issue title.");
      return;
    }
    if (!formData.category) {
      setErrorMsg("Please select an issue category.");
      return;
    }
    if (!formData.priority) {
      setErrorMsg("Please select a priority level.");
      return;
    }
    if (!formData.description.trim()) {
      setErrorMsg("Please describe the issue in detail.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (val) data.append(key, val);
      });

      if (attachMode === "url" && attachmentLink.trim()) {
        data.append("attachment_link", attachmentLink.trim());
      } else if (attachMode === "file" && files.length > 0) {
        files.forEach((file) => data.append("attachments[]", file));
      }

      const response = await api.post("/issues", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newIssue = response.data?.data;
      window.dispatchEvent(new Event("notifications-refresh"));

      if (onIssueCreated) {
        onIssueCreated(newIssue);
      }

      setSuccessIssue(newIssue);
    } catch (err: any) {
      console.error("Failed to raise issue", err);
      setErrorMsg(
        err.response?.data?.message ||
          "Failed to submit your issue. Please check the details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-white dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#56348f]/20 focus:border-[#56348f] dark:focus:border-purple-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-xs";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-50 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 shrink-0">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#56348f]/10 dark:bg-purple-500/20 text-[#56348f] dark:text-purple-300 flex items-center justify-center shrink-0">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Raise an Issue
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Submit a support ticket directly to the admin & tech team
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {successIssue ? (
            /* Success View */
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Issue Raised Successfully!
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mb-6">
                Ticket <span className="font-bold text-[#56348f] dark:text-purple-300">#{successIssue.id}</span> has been created. The team will review and update you on the progress.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Done
                </button>
                <button
                  onClick={() => {
                    handleClose();
                    router.push(`/issues/${successIssue.id}`);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#56348f] hover:bg-[#472a77] transition-colors shadow-sm cursor-pointer"
                >
                  View Ticket <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Main Form */
            <form id="raise-issue-form" onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Issue Title <span className="text-rose-500">*</span>
                </label>
                <input
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Brief summary of what you are experiencing..."
                  className={inputCls}
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className={inputCls}
                  >
                    <option value="" disabled>
                      Select Category
                    </option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Priority <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="priority"
                    required
                    value={formData.priority}
                    onChange={handleChange}
                    className={inputCls}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Related Module */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Related Module <span className="text-xs font-normal text-slate-400 lowercase">(optional)</span>
                </label>
                <select
                  name="related_module"
                  value={formData.related_module}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">Select Related Module</option>
                  {MODULES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Provide details, steps to reproduce, or context that will help us investigate quickly..."
                  className={`${inputCls} resize-none leading-relaxed`}
                />
              </div>

              {/* Attachment Mode */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Attachment <span className="text-xs font-normal text-slate-400 lowercase">(optional)</span>
                  </label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setAttachMode("url")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
                        attachMode === "url"
                          ? "bg-[#56348f] text-white shadow-xs font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Link2 className="w-3.5 h-3.5" /> URL Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttachMode("file")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
                        attachMode === "file"
                          ? "bg-[#56348f] text-white shadow-xs font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Upload File
                    </button>
                  </div>
                </div>

                {attachMode === "url" ? (
                  <div>
                    <input
                      type="url"
                      value={attachmentLink}
                      onChange={(e) => setAttachmentLink(e.target.value)}
                      placeholder="Paste link to screenshot, video, Google Drive, or Loom..."
                      className={inputCls}
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Ensure link permissions are set so admins can view it.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#56348f] dark:hover:border-purple-400 rounded-xl p-5 cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                      <UploadCloud className="w-7 h-7 text-slate-400 dark:text-slate-500 mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Click to upload screenshots or logs
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        PNG, JPG, PDF, TXT or DOC up to 10MB
                      </p>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {files.length > 0 && (
                      <div className="mt-2.5 space-y-1.5">
                        {files.map((file, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          >
                            <div className="flex items-center gap-2 truncate mr-3">
                              <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                {file.name}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(i)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors cursor-pointer shrink-0"
                              title="Remove file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!successIssue && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="raise-issue-form"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#56348f] hover:bg-[#472a77] disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Issue"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
