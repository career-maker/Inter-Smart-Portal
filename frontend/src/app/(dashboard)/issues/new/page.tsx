"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { ArrowLeft, Link2, UploadCloud, X } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  "Technical Issue", "Attendance Issue", "Leave Issue", "Payroll Issue",
  "HR Concern", "Portal Bug", "Feature Request", "General Query", "Other",
];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const MODULES = ["Attendance", "Leave", "Dashboard", "Announcements", "Profile", "Others"];

export default function NewIssuePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [attachMode, setAttachMode] = useState<"url" | "file">("url");
  const [files, setFiles] = useState<File[]>([]);
  const [attachmentLink, setAttachmentLink] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    priority: "",
    related_module: "",
    description: "",
  });

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((p) => [...p, ...Array.from(e.target.files!)]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, val]) => data.append(key, val));
      if (attachMode === "url" && attachmentLink.trim()) {
        data.append("attachment_link", attachmentLink.trim());
      } else if (attachMode === "file") {
        files.forEach((file) => data.append("attachments[]", file));
      }
      const response = await api.post("/issues", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      window.dispatchEvent(new Event("notifications-refresh"));
      router.push(`/issues/${response.data.data.id}`);
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to raise issue.");
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-slate-700 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-500 transition-colors [color-scheme:dark]";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/issues"
          className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
        >
          <ArrowLeft className="w-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Raise an Issue</h1>
          <p className="text-slate-300">Submit a support request to the admin team.</p>
        </div>
      </div>

      <div className="bg-slate-800/80 border border-white/10 rounded-2xl">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-white">Issue Details</h2>
          <p className="text-slate-400 text-sm mt-1">Please be as descriptive as possible.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Issue Title *
            </label>
            <input
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              placeholder="Brief summary of the issue..."
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select name="category" required value={formData.category} onChange={handleChange} className={inputCls}>
                <option value="" disabled className="bg-slate-700 text-slate-400">
                  Select Category
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-slate-700 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Priority *
              </label>
              <select name="priority" required value={formData.priority} onChange={handleChange} className={inputCls}>
                <option value="" disabled className="bg-slate-700 text-slate-400">
                  Select Priority
                </option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className="bg-slate-700 text-white">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Related Module (Optional)
            </label>
            <select name="related_module" value={formData.related_module} onChange={handleChange} className={inputCls}>
              <option value="" className="bg-slate-700 text-slate-400">
                Select Module
              </option>
              {MODULES.map((m) => (
                <option key={m} value={m} className="bg-slate-700 text-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Issue Description *
            </label>
            <textarea
              name="description"
              required
              rows={6}
              value={formData.description}
              onChange={handleChange}
              placeholder="Please describe your issue in detail..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* ── Attachment (URL or File toggle) ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Attachment (Optional)
              </label>
              <div className="flex bg-slate-700 rounded-lg p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAttachMode("url")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    attachMode === "url"
                      ? "bg-amber-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" /> URL Link
                </button>
                <button
                  type="button"
                  onClick={() => setAttachMode("file")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    attachMode === "file"
                      ? "bg-amber-500 text-white"
                      : "text-slate-400 hover:text-white"
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
                  placeholder="Paste a Google Drive, OneDrive, Dropbox, or screenshot URL..."
                  className={inputCls}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Make sure the link is publicly accessible or set to "Anyone with link can view".
                </p>
              </div>
            ) : (
              <div>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-amber-500/50 rounded-xl p-6 cursor-pointer transition-colors bg-white/5">
                  <UploadCloud className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-sm font-medium text-slate-300">Click to upload files</p>
                  <p className="text-xs text-slate-500 mt-1">Images, PDFs, or Documents</p>
                  <input type="file" multiple onChange={handleFileChange} className="hidden" />
                </label>
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                      >
                        <span className="text-sm text-slate-300 truncate mr-4">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                          className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
            <Link
              href="/issues"
              className="px-5 py-2 rounded-xl text-sm font-medium text-slate-300 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition-colors"
            >
              {loading ? "Submitting..." : "Submit Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
