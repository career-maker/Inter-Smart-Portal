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
  Table as TableIcon,
  FileCheck,
  ArrowRight
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
  start_date?: string;
  due_date?: string;
  assignees?: string;
  assignee_codes?: string;
  allotted_days?: string;
  time_taken?: string;
  description?: string;
  remarks?: string;
}

export function ImportTasksModal({
  isOpen,
  onClose,
  projects,
  onSuccess,
}: ImportTasksModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedTaskRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");
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

  const parseCsvText = (text: string) => {
    try {
      // Remove BOM if present
      const cleanText = text.replace(/^\uFEFF/, "");
      const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        setParsedRows([]);
        return;
      }

      // Parse header line
      const rawHeaders = parseCsvLine(lines[0]).map((h) =>
        h.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_")
      );

      const rows: ParsedTaskRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const rowValues = parseCsvLine(lines[i]);
        if (rowValues.length === 0 || rowValues.every((v) => !v.trim())) continue;

        const rowObj: any = {};
        rawHeaders.forEach((h, idx) => {
          rowObj[h] = (rowValues[idx] || "").trim();
        });

        const title = rowObj.title || rowObj.task_title || rowObj.name;
        if (title) {
          rows.push({
            title,
            project_name: rowObj.project_name || rowObj.project,
            sub_phase: rowObj.sub_phase || rowObj.sub_phase_name || rowObj.phase,
            priority: rowObj.priority || "Medium",
            status: rowObj.status || "Yet to Start",
            start_date: rowObj.start_date || "",
            due_date: rowObj.due_date || "",
            assignees: rowObj.assignee_codes || rowObj.assignee_emails || rowObj.assignees || "",
            assignee_codes: rowObj.assignee_codes || rowObj.assignees || "",
            allotted_days: rowObj.allotted_days || "",
            time_taken: rowObj.time_taken || "",
            description: rowObj.description || rowObj.details || "",
            remarks: rowObj.remarks || rowObj.notes || rowObj.current_updates || "",
          });
        }
      }

      setParsedRows(rows);
    } catch (e) {
      console.warn("CSV Preview parsing error", e);
    }
  };

  // Helper to accurately parse a CSV line taking quotes and commas into account
  const parseCsvLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current);
    return values.map((v) => v.replace(/^["']|["']$/g, "").trim());
  };

  const processSelectedFile = (file: File) => {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".txt")) {
      setError("Please select a valid CSV (.csv) file. If editing in Excel, choose 'Save As' -> 'CSV (Comma delimited) (*.csv)'.");
      return;
    }

    setError(null);
    setSelectedFile(file);
    setImportResult(null);
    setProgressPercent(0);
    setProgressText("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parseCsvText(content);
      }
    };
    reader.onerror = () => {
      setError("Failed to read the file. Please check file permissions.");
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && parsedRows.length === 0) {
      setError("Please select or drop a CSV file to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    setImportResult(null);
    setProgressPercent(5);
    setProgressText(`Preparing ${parsedRows.length} tasks for batch import...`);

    try {
      // If we have parsed rows from client, chunk into batches of 50 for guaranteed fast processing
      if (parsedRows.length > 0) {
        const CHUNK_SIZE = 50;
        const totalRows = parsedRows.length;
        let totalImported = 0;
        let totalSkipped = 0;
        const allErrors: string[] = [];

        for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
          const chunk = parsedRows.slice(i, i + CHUNK_SIZE);
          const currentBatchEnd = Math.min(i + CHUNK_SIZE, totalRows);
          setProgressText(`Importing batch (${currentBatchEnd} of ${totalRows} tasks)...`);
          setProgressPercent(Math.round(((i + 1) / totalRows) * 90));

          try {
            const payload: any = {
              tasks: chunk,
            };
            if (selectedProjectId) {
              payload.project_id = Number(selectedProjectId);
            }
            const res = await pmApi.importTasks(payload);
            totalImported += res.imported_count || 0;
            totalSkipped += res.skipped_count || 0;
            if (res.errors && res.errors.length > 0) {
              allErrors.push(...res.errors);
            }
          } catch (chunkErr: any) {
            console.warn(`Chunk ${i} failed`, chunkErr);
            totalSkipped += chunk.length;
            allErrors.push(`Batch ${i + 1}-${currentBatchEnd} error: ${chunkErr?.response?.data?.message || chunkErr?.message || "Server error"}`);
          }
        }

        setProgressPercent(100);
        setProgressText(`Done! ${totalImported} tasks imported successfully.`);

        const finalResult = {
          imported_count: totalImported,
          skipped_count: totalSkipped,
          errors: allErrors,
          message: `Import complete: ${totalImported} tasks successfully imported${totalSkipped > 0 ? ` (${totalSkipped} skipped)` : ""}.`,
        };

        setImportResult(finalResult);
        if (totalImported > 0) {
          onSuccess();
        }
      } else {
        // Fallback to direct file upload
        const formData = new FormData();
        formData.append("file", selectedFile!);
        if (selectedProjectId) {
          formData.append("project_id", selectedProjectId);
        }

        setProgressPercent(50);
        setProgressText("Uploading and processing spreadsheet...");
        const res = await pmApi.importTasks(formData);
        setProgressPercent(100);
        setImportResult(res);
        if (res.imported_count > 0) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0] ||
        err?.message ||
        "Failed to import tasks. Please check CSV format."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setImportResult(null);
    setProgressPercent(0);
    setProgressText("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
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

        {/* ── Modal Form ── */}
        <form onSubmit={handleImportSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            {/* Instructions & Template Download Banner */}
            {!importResult && (
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
            )}

            {/* Live Progress Bar during active upload */}
            {uploading && (
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[#56348f] dark:text-purple-300">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{progressText || "Processing tasks..."}</span>
                  </div>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-purple-200 dark:bg-purple-900 overflow-hidden">
                  <div
                    className="h-full bg-[#56348f] rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Success Result Display */}
            {importResult && (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3.5 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      Import Complete!
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      {importResult.imported_count} tasks were successfully created and added to your workspace.
                    </p>
                  </div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 p-3 rounded-xl border border-amber-200 dark:border-amber-800 space-y-1">
                    <p className="font-bold">Skipped Rows / Warnings ({importResult.skipped_count}):</p>
                    <ul className="list-disc list-inside space-y-0.5 max-h-28 overflow-y-auto">
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
            {!importResult && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Default Project <span className="text-slate-400 font-normal">(optional fallback if CSV doesn't specify project_name)</span>
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
            )}

            {/* File Upload Dropzone with full Drag-and-Drop */}
            {!importResult && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select or Drop CSV File <span className="text-rose-500">*</span>
                </label>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`p-7 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                    isDragging
                      ? "border-[#56348f] bg-purple-100/50 dark:bg-purple-900/30 scale-[0.99]"
                      : selectedFile
                      ? "border-purple-400 dark:border-purple-700 bg-purple-50/40 dark:bg-purple-950/20"
                      : "border-slate-300 dark:border-slate-700 hover:border-[#56348f] bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className={`p-3.5 rounded-full border shadow-xs transition-colors ${
                    selectedFile
                      ? "bg-purple-100 text-[#56348f] border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#56348f] dark:text-purple-300"
                  }`}>
                    {selectedFile ? <FileCheck className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                  </div>

                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-purple-700 dark:text-purple-300 font-semibold">
                        {(selectedFile.size / 1024).toFixed(1)} KB • {parsedRows.length} tasks ready to import
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Click to choose a different file
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Click to browse or drag and drop your CSV file here
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Supports .csv format (saved from Excel or Google Sheets)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Parsed Rows Preview */}
            {!importResult && parsedRows.length > 0 && (
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
            {importResult ? (
              <div className="w-full flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-semibold"
                >
                  Import Another File
                </button>
                <button
                  type="button"
                  onClick={handleDone}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#432870] text-white font-semibold shadow-sm cursor-pointer text-xs"
                >
                  <span>Done & View Tasks</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
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
                  type="submit"
                  disabled={(!selectedFile && parsedRows.length === 0) || uploading}
                  style={{
                    fontFamily: '"Proxima Nova", sans-serif',
                    fontSize: "13px",
                    lineHeight: "20px",
                    fontWeight: 500,
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#432870] text-white shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{progressText || "Importing..."}</span>
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
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
