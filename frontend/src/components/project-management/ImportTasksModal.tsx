"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Info,
  FolderKanban,
  Table as TableIcon
} from "lucide-react";
import { Project } from "@/types/pm";
import pmApi from "@/services/pm";

interface ImportTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onSuccess: () => void;
}

interface ParsedTaskRow {
  title: string;
  project_name?: string;
  sub_phase?: string;
  priority?: string;
  status?: string;
  due_date?: string;
  assignees?: string;
  allotted_days?: string;
}

export function ImportTasksModal({
  isOpen,
  onClose,
  projects,
  onSuccess,
}: ImportTasksModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedTaskRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    imported_count: number;
    skipped_count: number;
    errors: string[];
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      setError(null);
      const blob = await pmApi.downloadTaskImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasks-import-template-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to download sample CSV template.");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const parseCsvPreview = (text: string) => {
    try {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        setParsedRows([]);
        return;
      }

      // Parse headers
      const rawHeaders = lines[0].split(",").map((h) =>
        h.replace(/^["']|["']$/g, "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")
      );

      const rows: ParsedTaskRow[] = [];
      for (let i = 1; i < Math.min(lines.length, 100); i++) {
        const line = lines[i];
        // Handle basic quoted commas
        const matches = line.match(/(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g);
        if (!matches) continue;

        const rowValues = matches.map((v) =>
          v.replace(/^,/, "").replace(/^["']|["']$/g, "").trim()
        );

        const rowObj: any = {};
        rawHeaders.forEach((h, idx) => {
          rowObj[h] = rowValues[idx] || "";
        });

        const title = rowObj.title || rowObj.task_title || rowObj.name;
        if (title) {
          rows.push({
            title,
            project_name: rowObj.project_name || rowObj.project,
            sub_phase: rowObj.sub_phase || rowObj.sub_phase_name || rowObj.phase,
            priority: rowObj.priority || "Medium",
            status: rowObj.status || "Yet to Start",
            due_date: rowObj.due_date || "",
            assignees: rowObj.assignee_codes || rowObj.assignee_emails || rowObj.assignees || "",
            allotted_days: rowObj.allotted_days || "",
          });
        }
      }

      setParsedRows(rows);
    } catch (e) {
      console.warn("CSV Preview parsing error", e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      setError("Please select a valid .csv file.");
      return;
    }

    setError(null);
    setSelectedFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parseCsvPreview(content);
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a CSV file to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (selectedProjectId) {
        formData.append("project_id", selectedProjectId);
      }

      const res = await pmApi.importTasks(formData);
      setImportResult(res);
      if (res.imported_count > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0] ||
        err?.message ||
        "Failed to import tasks."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      style={{ fontFamily: '"Proxima Nova", sans-serif' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-[#56348f] dark:text-purple-300">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Import Tasks via CSV
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bulk create tasks, phases, deadlines, and member assignments from a spreadsheet.
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

        {/* ── Modal Body ── */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          {/* Instructions & Template Download Banner */}
          <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#56348f] dark:text-purple-300">
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>CSV Template & Formatting Guide</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Download our sample template containing column headers (title, project, sub-phase, priority, status, assignees).
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              style={{
                fontSize: "13px",
                lineHeight: "20px",
                fontWeight: 500,
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#56348f] dark:text-purple-300 border border-purple-300 dark:border-purple-700 shadow-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {downloadingTemplate ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download Sample CSV</span>
            </button>
          </div>

          {/* Success Result Display */}
          {importResult && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{importResult.message}</span>
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 space-y-1">
                  <p className="font-bold">Skipped Rows / Warnings:</p>
                  <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Default Project Selection (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Default Project <span className="text-slate-400 font-normal">(optional fallback if CSV doesn't specify)</span>
            </label>
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                style={{ fontSize: "13px", lineHeight: "20px" }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#56348f]/20 focus:border-[#56348f] transition-all cursor-pointer"
              >
                <option value="">Auto-resolve from CSV `project_name` column</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.team?.name ? `(${p.team.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* File Upload Dropzone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select CSV File <span className="text-rose-500">*</span>
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-2 ${
                selectedFile
                  ? "border-[#56348f] bg-purple-50/30 dark:bg-purple-950/20"
                  : "border-slate-300 dark:border-slate-700 hover:border-[#56348f] bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="p-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs text-[#56348f] dark:text-purple-300">
                <Upload className="w-5 h-5" />
              </div>

              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {parsedRows.length} tasks ready to import
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click to browse or drag and drop your CSV file here
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Supports .csv files up to 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Parsed Rows Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <TableIcon className="w-3.5 h-3.5 text-[#56348f] dark:text-purple-400" />
                  <span>Preview ({parsedRows.length} Tasks Detected)</span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Clear File
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl scrollbar-thin">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Title</th>
                      <th className="py-2 px-3">Project</th>
                      <th className="py-2 px-3">Sub-Phase</th>
                      <th className="py-2 px-3">Priority</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Assignees</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {parsedRows.slice(0, 15).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white max-w-[160px] truncate">{row.title}</td>
                        <td className="py-2 px-3 text-slate-500 max-w-[120px] truncate">{row.project_name || (selectedProjectId ? "Default Project" : "—")}</td>
                        <td className="py-2 px-3">{row.sub_phase || "General"}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {row.priority}
                          </span>
                        </td>
                        <td className="py-2 px-3">{row.status}</td>
                        <td className="py-2 px-3 text-slate-500 max-w-[100px] truncate">{row.assignees || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 15 && (
                <p className="text-[10px] text-slate-400 italic text-right">
                  Showing first 15 of {parsedRows.length} total tasks...
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            style={{
              fontSize: "13px",
              lineHeight: "20px",
              fontWeight: 400,
            }}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={!selectedFile || uploading}
            style={{
              fontFamily: '"Proxima Nova", sans-serif',
              fontSize: "13px",
              lineHeight: "20px",
              fontWeight: 500,
            }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#56348f] hover:bg-[#432870] text-white shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importing Tasks...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>
                  {parsedRows.length > 0
                    ? `Import ${parsedRows.length} Tasks`
                    : "Upload & Import Tasks"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
