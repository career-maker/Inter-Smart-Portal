"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import api from "@/services/api";

interface Props {
  isOpen: boolean;
  teamId: number | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAllTasksModal({ isOpen, teamId, onClose, onDeleted }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !teamId) return;
    setCount(null);
    setTyped("");
    setError(null);
    api
      .post("/project-tasks/delete-all", { team_id: teamId, dry_run: true })
      .then((r) => {
        setCount(r.data.count);
        setTeamName(r.data.team_name || "");
      })
      .catch((e) => setError(e?.response?.data?.message || "Could not check how many tasks would be deleted."));
  }, [isOpen, teamId]);

  if (!isOpen) return null;

  const confirmDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post("/project-tasks/delete-all", { team_id: teamId, confirm: "DELETE" });
      onDeleted();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="del-all-title">
        <div className="fixed inset-0 bg-slate-950/70" onClick={busy ? undefined : onClose} />
        <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 id="del-all-title" className="text-base font-bold text-slate-900 dark:text-white">
                Delete all tasks{teamName ? ` of ${teamName}` : ""}?
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {count === null && !error
                  ? "Counting tasks..."
                  : `This removes all ${count ?? 0} tasks of this team from the tracker, including completed ones, in every project.`}{" "}
                People, projects and other teams&apos; tasks are not touched. Only an administrator can restore deleted tasks.
              </p>
            </div>
          </div>

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Type <span className="font-mono text-rose-600">DELETE</span> to confirm
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={busy}
              autoComplete="off"
              className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </label>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={busy || typed !== "DELETE" || !count}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete {count ?? ""} tasks
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
