"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect, useRef } from "react";
import { FileText, Plus, Upload, Download, Clock, CheckCircle, ExternalLink, Link2, Loader2 } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";

const DOCUMENT_TYPES = [
  "Salary Certificate",
  "Experience Certificate",
  "Employment Certificate",
  "Visa Support Letter",
  "Offer Letter Copy",
  "Appointment Letter Copy",
  "Relieving Letter",
  "Increment Letter",
  "Custom Request",
];

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://127.0.0.1:8002";

type FulfillMode = "file" | "url";

export default function DocumentsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Super Admin" || user?.role === "HR";

  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [fulfillMode, setFulfillMode] = useState<FulfillMode>("file");

  const [subject, setSubject] = useState("");
  const [docType, setDocType] = useState("");
  const [description, setDescription] = useState("");

  const uploadFileRef = useRef<HTMLInputElement>(null);
  const [uploadComment, setUploadComment] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/document-requests");
      setRequests(res.data.data.data || res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!docType) return;
    setActionLoading(true);
    try {
      await api.post("/document-requests", {
        subject: docType === "Custom Request" ? subject : docType,
        description,
      });
      setShowRequestDialog(false);
      setSubject(""); setDocType(""); setDescription("");
      fetchRequests();
    } catch (e: any) {
      alert(e.response?.data?.message || "Error submitting request.");
    } finally {
      setActionLoading(false);
    }
  };

  const fulfillDocument = async () => {
    if (!showUploadDialog) return;
    const file = uploadFileRef.current?.files?.[0];

    if (fulfillMode === "file" && !file) { alert("Please select a file."); return; }
    if (fulfillMode === "url" && !uploadUrl.trim()) { alert("Please enter a document URL."); return; }

    setActionLoading(true);
    try {
      const formData = new FormData();
      if (fulfillMode === "file" && file) formData.append("file", file);
      if (uploadUrl.trim()) formData.append("document_url", uploadUrl.trim());
      formData.append("comments", uploadComment);

      await api.post(`/document-requests/${showUploadDialog.id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowUploadDialog(null);
      setUploadComment(""); setUploadUrl("");
      if (uploadFileRef.current) uploadFileRef.current.value = "";
      fetchRequests();
    } catch (e: any) {
      const msg = e.response?.data?.message || "Failed to fulfill request.";
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const openFulfill = (req: any) => {
    setShowUploadDialog(req);
    setFulfillMode("file");
    setUploadComment(""); setUploadUrl("");
  };

  const fmtDate = (d: string) => {
    try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
  };

  const getLastUpload = (req: any) => req.uploads?.[req.uploads.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-amber-400" /> Document Requests
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1">Request official documents from HR.</p>
        </div>
        <button
          onClick={() => setShowRequestDialog(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" /> Request Document
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-500 dark:text-slate-400" /></div>
      ) : requests.length === 0 ? (
        <div className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl py-16 text-center space-y-3">
          <FileText className="h-12 w-12 mx-auto text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">No document requests yet.</p>
          <button onClick={() => setShowRequestDialog(true)} className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2">
            Make your first request
          </button>
        </div>
      ) : (
        <div className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-white/5 border-b border-slate-200 dark:border-white/10">
                <tr>
                  {isAdmin && <th className="px-5 py-3">Employee</th>}
                  <th className="px-5 py-3">Request No.</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Requested On</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {requests.map((req) => {
                  const lastUpload = getLastUpload(req);
                  return (
                    <tr key={req.id} className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                      {isAdmin && (
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {req.user?.first_name} {req.user?.last_name}
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg">
                          {req.request_number}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{req.subject}</td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-xs">{fmtDate(req.created_at)}</td>
                      <td className="px-5 py-4">
                        {req.status === "Uploaded" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                            <CheckCircle className="h-3 w-3" /> Fulfilled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {/* File download */}
                          {lastUpload?.file_path && (
                            <a
                              href={`${BACKEND_URL}/storage/${lastUpload.file_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg hover:bg-blue-500/30 transition"
                            >
                              <Download className="h-3.5 w-3.5" /> Download
                            </a>
                          )}
                          {/* Document URL */}
                          {lastUpload?.document_url && (
                            <a
                              href={lastUpload.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg hover:bg-indigo-500/30 transition"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Open Link
                            </a>
                          )}
                          {/* Admin fulfill button */}
                          {isAdmin && req.status === "Pending" && (
                            <button
                              onClick={() => openFulfill(req)}
                              className="inline-flex items-center gap-1.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg hover:bg-amber-500/30 transition"
                            >
                              <Upload className="h-3.5 w-3.5" /> Fulfill
                            </button>
                          )}
                        </div>
                        {/* Upload comment */}
                        {lastUpload?.comments && (
                          <p className="text-xs text-slate-500 mt-1.5 italic">{lastUpload.comments}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Request Document Dialog ── */}
      {showRequestDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRequestDialog(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-10">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Request a Document</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Select the document type you need from HR.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Document Type *
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="" className="bg-slate-700 text-slate-500 dark:text-slate-400">Select document type...</option>
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-slate-700">{t}</option>
                  ))}
                </select>
              </div>
              {docType === "Custom Request" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter document subject..."
                    className="w-full bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-500 transition-colors"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Additional Notes <span className="text-slate-500 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any additional information for HR..."
                  className="w-full bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-500 resize-none transition-colors"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
              <button onClick={() => setShowRequestDialog(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={submitRequest}
                disabled={actionLoading || !docType || (docType === "Custom Request" && !subject)}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fulfill Document Dialog (Admin) ── */}
      {showUploadDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUploadDialog(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-10">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fulfill Document Request</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                For: <span className="text-slate-900 dark:text-white font-medium">{showUploadDialog?.subject}</span>
              </p>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Mode toggle */}
              <div className="flex rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-700/50 p-1 gap-1">
                <button
                  onClick={() => setFulfillMode("file")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${fulfillMode === "file" ? "bg-amber-500 text-white shadow" : "text-slate-400 hover:text-white"}`}
                >
                  <Upload className="w-4 h-4" /> Upload File
                </button>
                <button
                  onClick={() => setFulfillMode("url")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${fulfillMode === "url" ? "bg-amber-500 text-white shadow" : "text-slate-400 hover:text-white"}`}
                >
                  <Link2 className="w-4 h-4" /> Share URL
                </button>
              </div>

              {fulfillMode === "file" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Document File *
                  </label>
                  <input
                    ref={uploadFileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="w-full text-sm text-slate-600 dark:text-slate-300 bg-slate-700 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-white hover:file:bg-amber-600 cursor-pointer"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">PDF, DOC, DOCX, JPG, PNG — max 10 MB</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Document URL *
                  </label>
                  <input
                    type="url"
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    placeholder="https://drive.google.com/... or any document URL"
                    className="w-full bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-500 transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">Google Drive, SharePoint, or any publicly accessible URL.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Comments <span className="text-slate-500 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={uploadComment}
                  onChange={(e) => setUploadComment(e.target.value)}
                  placeholder="Any notes for the employee..."
                  className="w-full bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-500 resize-none transition-colors"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
              <button onClick={() => setShowUploadDialog(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={fulfillDocument}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (fulfillMode === "file" ? <Upload className="w-4 h-4" /> : <Link2 className="w-4 h-4" />)}
                {fulfillMode === "file" ? "Upload & Fulfill" : "Save URL & Fulfill"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
