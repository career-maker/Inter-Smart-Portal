"use client";

import { SelectCompat } from "@/components/ui/SelectCompat";
import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import api from "@/services/api";
import pmApi from "@/services/pm";
import { TaskPrioritySelect } from "@/components/project-management/priorityPalette";
import { Portal } from "@/components/ui/portal";
import { ProjectTask } from "@/types/pm";

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const field = "w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500";
const day = (v?: string | null) => (v ? String(v).slice(0, 10) : "");

/** Planning fields of a task: title, phase, priority, dates, description. Assignees use the Manage Assignees panel. */
export function EditTaskModal({ isOpen, onClose, task, onSuccess }: { isOpen: boolean; onClose: () => void; task: ProjectTask; onSuccess: (t: ProjectTask) => void }) {
  const [phases, setPhases] = useState<{ id: number; name: string }[]>([]);
  const [catalogs, setCatalogs] = useState<{ id: number; name: string }[]>([]);
  const [f, setF] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setF({ title: task.title, description: task.description || "", sub_phase_id: task.sub_phase_id ?? "", catalog_task_id: task.catalog_task_id ?? "", priority: task.priority || "Medium", start_date: day(task.start_date), due_date: day(task.due_date) });
    pmApi.getTaskCatalog({ is_active: true, all: true }).then((r: any) => setCatalogs(Array.isArray(r?.data) ? r.data : [])).catch(() => setCatalogs([]));
    api.get(`/project-tasks/${task.id}/phases`).then((r) => setPhases(r.data.data)).catch(() => setPhases([]));
  }, [isOpen, task]);

  if (!isOpen) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await pmApi.updateTask(task.id, {
        title: f.title, description: f.description || null, sub_phase_id: f.sub_phase_id === "" ? null : Number(f.sub_phase_id), catalog_task_id: f.catalog_task_id === "" ? null : Number(f.catalog_task_id),
        priority: f.priority, start_date: f.start_date || null, due_date: f.due_date || null,
      } as any);
      const fresh = await pmApi.getTask(task.id); // the update response has no phase / assignee names
      onSuccess(fresh.data ?? res.data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not save the task.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <div onClick={onClose} className="fixed inset-0 bg-slate-950/70" />
        <form onSubmit={save} className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-5 space-y-3 shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between"><h2 className="font-bold text-lg text-slate-900 dark:text-white">Edit task</h2>
            <button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <label className="block text-xs font-semibold text-slate-500">Title<input required className={field} value={f.title || ""} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
          <label className="block text-xs font-semibold text-slate-500">Task (from the task catalog)
            <SelectCompat className={field} value={f.catalog_task_id ?? ""} onChange={(e) => {
              const c = catalogs.find((x) => String(x.id) === e.target.value);
              const was = catalogs.find((x) => String(x.id) === String(f.catalog_task_id));
              // choosing a catalog task names the task after it, unless the title was typed by hand
              setF({ ...f, catalog_task_id: e.target.value, title: c && (!f.title || f.title === was?.name) ? c.name : f.title });
            }}>
              <option value="">Custom task (no catalog template)</option>{catalogs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectCompat></label>
          <label className="block text-xs font-semibold text-slate-500">Sub phase
            <SelectCompat className={field} value={f.sub_phase_id ?? ""} onChange={(e) => setF({ ...f, sub_phase_id: e.target.value })}>
              <option value="">No phase</option>{phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </SelectCompat></label>
          <label className="block text-xs font-semibold text-slate-500">Priority
            <TaskPrioritySelect value={f.priority || "Medium"} onChange={(v) => setF({ ...f, priority: v })} showLabel className="w-full mt-1" priorities={PRIORITIES} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-slate-500">Start<input type="date" className={field} value={f.start_date || ""} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></label>
            <label className="block text-xs font-semibold text-slate-500">Due<input type="date" className={field} value={f.due_date || ""} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></label>
          </div>
          <label className="block text-xs font-semibold text-slate-500">Description<textarea rows={3} className={field} value={f.description || ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
            <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-[#56348f] text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
