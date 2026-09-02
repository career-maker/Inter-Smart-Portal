"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { ArrowLeft, Paperclip, Send, Clock, User, Download, FileText, ExternalLink, Link2, UserCheck, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { getStorageUrl } from "@/lib/utils";
import { PageLoader } from "@/components/ui/PageLoader";

const STATUS_COLORS: Record<string, string> = {
  "Open": "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-300 dark:border-blue-500/30",
  "In Progress": "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border-purple-300 dark:border-purple-500/30",
  "Waiting for User Response": "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 border-orange-300 dark:border-orange-500/30",
  "Resolved": "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30",
  "Closed": "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border-slate-300 dark:border-slate-500/30",
  "Rejected": "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border-red-300 dark:border-red-500/30",
};

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assign state (super admin only)
  const [employees, setEmployees] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);

  const isSuperAdmin = user?.role === "Super Admin";

  useEffect(() => { fetchIssue(); }, [params.id]);

  useEffect(() => {
    if (isSuperAdmin) {
      api.get("/employees?per_page=200")
        .then(res => {
          const list = res.data?.data?.data || res.data?.data || (Array.isArray(res.data) ? res.data : []);
          setEmployees(list);
        })
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  const fetchIssue = async () => {
    try {
      const res = await api.get(`/issues/${params.id}`);
      setIssue(res.data.data);
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.message || "Failed to load issue.");
      router.push("/issues");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.put(`/issues/${params.id}/status`, { status: newStatus });
      fetchIssue();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to update status.");
    }
  };

  const handleAssign = async (userId: string) => {
    setAssigning(true);
    try {
      await api.put(`/issues/${params.id}/assign`, {
        assigned_to: userId === "" ? null : Number(userId),
      });
      fetchIssue();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to assign issue.");
    } finally {
      setAssigning(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && files.length === 0) return;
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("comment", commentText);
      files.forEach((file) => data.append("attachments[]", file));
      await api.post(`/issues/${params.id}/comments`, data, { headers: { "Content-Type": "multipart/form-data" } });
      setCommentText("");
      setFiles([]);
      fetchIssue();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!issue) return null;

  // Laravel serialises the assignedTo() relationship as `assigned_to` (object) in JSON,
  // overwriting the raw integer column. Normalise both cases.
  const assignedToObj: any = issue.assigned_to && typeof issue.assigned_to === "object" ? issue.assigned_to : null;
  const assignedToId: number | null = assignedToObj ? assignedToObj.id : (typeof issue.assigned_to === "number" ? issue.assigned_to : null);
  const isAssignedToMe = !isSuperAdmin && assignedToId === user?.id;
  const statusCls = STATUS_COLORS[issue.status] || "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border-slate-300 dark:border-slate-500/30";

  const inputCls = "w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[#56348f] dark:focus:border-amber-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors resize-none";

  return (
    <div className="max-w-5xl mx-auto space-y-6 mt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/issues" className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center flex-wrap gap-3">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">#{issue.id} {issue.title}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCls}`}>
                {issue.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
              <span>By {issue.user?.first_name} {issue.user?.last_name}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {format(new Date(issue.created_at), "PPp")}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isSuperAdmin && (
            <select
              value={issue.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-[#56348f]"
            >
              {["Open", "In Progress", "Waiting for User Response", "Resolved", "Rejected", "Closed"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {/* Assigned employee can mark as Resolved */}
          {isAssignedToMe && issue.status !== "Resolved" && issue.status !== "Closed" && (
            <button
              onClick={() => handleStatusChange("Resolved")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark as Resolved
            </button>
          )}

          {/* Owner may reopen */}
          {!isSuperAdmin && !isAssignedToMe && (issue.status === "Resolved" || issue.status === "Closed") && (
            <button
              onClick={() => handleStatusChange("Open")}
              className="px-4 py-2 text-sm font-medium bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              Reopen Issue
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main thread */}
        <div className="lg:col-span-2 space-y-4">
          {/* Original post */}
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
            <div className="p-5 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
                  {issue.user?.profile_photo_path ? (
                    <img src={issue.user.profile_photo_path} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <span>{issue.user?.first_name?.[0]}{issue.user?.last_name?.[0]}</span>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{issue.user?.first_name} {issue.user?.last_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{format(new Date(issue.created_at), "PPp")}</p>
                  </div>
                  <div className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap text-sm leading-relaxed">
                    {issue.description}
                  </div>

                  {/* Attachment link */}
                  {issue.attachment_link && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                      <Link2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <a href={issue.attachment_link} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline truncate flex items-center gap-1">
                        Open Attachment <ExternalLink className="w-3.5 h-3.5 inline shrink-0" />
                      </a>
                    </div>
                  )}

                  {/* File attachments */}
                  {issue.attachments && issue.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                      {issue.attachments.map((att: any) => (
                        <a key={att.id} href={getStorageUrl(att.file_path)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-sm text-slate-700 dark:text-slate-300 transition-colors">
                          <FileText className="w-4 h-4 text-amber-500" />
                          <span className="truncate max-w-[180px]">{att.file_name}</span>
                          <Download className="w-3.5 h-3.5 text-slate-400 ml-1" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comments */}
            {issue.comments && issue.comments.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {issue.comments.map((comment: any) => (
                  <div key={comment.id} className="p-5">
                    <div className="flex gap-4">
                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-white shrink-0 overflow-hidden">
                        {comment.user?.profile_photo_path ? (
                          <img src={comment.user.profile_photo_path} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <span>{comment.user?.first_name?.[0]}{comment.user?.last_name?.[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">{comment.user?.first_name} {comment.user?.last_name}</p>
                          {comment.user?.id === issue.user_id && (
                            <span className="text-[10px] uppercase tracking-wider bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">Author</span>
                          )}
                          <span className="text-xs text-slate-400 ml-auto">{format(new Date(comment.created_at), "PPp")}</span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm">{comment.comment}</div>
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {comment.attachments.map((att: any) => (
                              <a key={att.id} href={getStorageUrl(att.file_path)} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-xs text-slate-600 dark:text-slate-400 transition-colors">
                                <Paperclip className="w-3.5 h-3.5" />
                                <span className="truncate max-w-[140px]">{att.file_name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply box */}
            {(isSuperAdmin || isAssignedToMe) && (
              <div className="p-5 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10">
                <form onSubmit={handleCommentSubmit} className="space-y-3">
                <textarea
                  placeholder="Type your reply..."
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className={inputCls}
                />
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <div key={i} className="text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-1 rounded-lg flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="truncate max-w-[140px]">{f.name}</span>
                        <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-500">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-[#56348f] dark:hover:text-amber-400 transition-colors px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10">
                    <Paperclip className="w-3.5 h-3.5" /> Attach File
                  </button>
                  <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]); }} />
                  <button type="submit" disabled={submitting || (!commentText.trim() && files.length === 0)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[#56348f] hover:bg-[#472a77] text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors">
                    <Send className="w-3.5 h-3.5" />
                    {submitting ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </form>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-white/10 pb-3">Details</h3>
            <div className="space-y-3 text-sm">
              <Detail label="Status" value={<span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusCls}`}>{issue.status}</span>} />
              <Detail label="Priority" value={<PriorityBadge p={issue.priority} />} />
              <Detail label="Category" value={issue.category} />
              {issue.related_module && <Detail label="Module" value={issue.related_module} />}

              {/* Assign to employee (super admin only) */}
              {isSuperAdmin ? (
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider block mb-1.5">
                    Assigned To {assigning && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}
                  </span>
                  <select
                    value={assignedToId ?? ""}
                    onChange={(e) => handleAssign(e.target.value)}
                    disabled={assigning}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-2 outline-none focus:border-[#56348f] disabled:opacity-60"
                  >
                    <option value="">— Unassigned —</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_code || emp.email})
                      </option>
                    ))}
                  </select>
                  {assignedToObj && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      {assignedToObj.first_name} {assignedToObj.last_name}
                    </p>
                  )}
                </div>
              ) : (
                <Detail label="Assigned To" value={
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className={isAssignedToMe ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}>
                      {assignedToObj
                        ? `${assignedToObj.first_name} ${assignedToObj.last_name}${isAssignedToMe ? " (You)" : ""}`
                        : "Unassigned"}
                    </span>
                  </div>
                } />
              )}

              {issue.attachment_link && (
                <Detail label="Attachment" value={
                  <a href={issue.attachment_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center gap-1 underline">
                    Open Link <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                } />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider block mb-0.5">{label}</span>
      <span className="font-medium text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}

function PriorityBadge({ p }: { p: string }) {
  const cls: Record<string, string> = {
    Critical: "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-500/20",
    High: "text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-500/20",
    Medium: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-500/20",
    Low: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-500/20",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls[p] || "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-500/20"}`}>{p}</span>;
}
