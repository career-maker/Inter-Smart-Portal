"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, Trash2, Edit, Loader2, CheckCircle } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
const HOLIDAY_TYPES = [
  { value: "National Holiday",  label: "National Holiday",  cls: "bg-blue-500/20 text-blue-300" },
  { value: "Festival Holiday",  label: "Festival Holiday",  cls: "bg-amber-500/20 text-amber-300" },
  { value: "Company Holiday",   label: "Company Holiday",   cls: "bg-emerald-500/20 text-emerald-300" },
  { value: "Optional Holiday",  label: "Optional Holiday",  cls: "bg-purple-500/20 text-purple-300" },
];

function TypeBadge({ type }: { type: string }) {
  const t = HOLIDAY_TYPES.find((x) => x.value === type) ?? { cls: "bg-white/10 text-slate-300", label: type };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${t.cls}`}>{t.label}</span>;
}

export default function HolidaysPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "Super Admin" || user?.role === "HR";

  const [holidays, setHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [editId, setEditId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<"holidays" | "overrides">("holidays");
  const [overrides, setOverrides] = useState<any[]>([]);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("National Holiday");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.push("/calendar");
      return;
    }
    fetchHolidays();
    fetchOverrides();
  }, [user]);

  const fetchHolidays = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/holidays");
      setHolidays(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOverrides = async () => {
    try {
      const res = await api.get("/working-days-overrides");
      setOverrides(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const openNewOverride = () => {
    setOverrideDate("");
    setOverrideReason("");
    setShowOverrideDialog(true);
  };

  const saveOverride = async () => {
    if (!overrideDate) return;
    setActionLoading(true);
    try {
      await api.post("/working-days-overrides", {
        date: overrideDate,
        reason: overrideReason || "Compensatory Working Day",
      });
      setShowOverrideDialog(false);
      setSuccessMessage("Working day override saved successfully!");
      setShowSuccess(true);
      fetchOverrides();
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      const msg = errors ? Object.values(errors).flat().join("\n") : e.response?.data?.message || "Error saving override.";
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteOverride = async (id: number) => {
    if (!confirm("Delete this working day override? The day will revert to being a holiday.")) return;
    try {
      await api.delete(`/working-days-overrides/${id}`);
      fetchOverrides();
    } catch (e: any) {
      alert(e.response?.data?.message || "Error deleting override.");
    }
  };

  const openNew = () => {
    setEditId(null);
    setName(""); setDate(""); setType("National Holiday"); setDescription("");
    setShowDialog(true);
  };

  const openEdit = (h: any) => {
    setEditId(h.id);
    setName(h.name); setDate(h.date); setType(h.type || "National Holiday"); setDescription(h.description || "");
    setShowDialog(true);
  };

  const saveHoliday = async () => {
    if (!name || !date || !type) return;
    setActionLoading(true);
    try {
      const payload = { name, date, type, description };
      if (editId) {
        await api.put(`/holidays/${editId}`, payload);
        // Optimistic update for edited holiday
        setHolidays(holidays.map(h => h.id === editId ? { ...h, ...payload } : h));
        setSuccessMessage("Holiday updated successfully!");
      } else {
        const res = await api.post("/holidays", payload);
        // Optimistic update for new holiday
        const newHoliday = res.data?.data || { id: Date.now(), ...payload };
        setHolidays([...holidays, newHoliday]);
        setSuccessMessage("Holiday added successfully!");
      }
      setShowDialog(false);
      setShowSuccess(true);
      // Refresh in background for data consistency
      setTimeout(() => fetchHolidays(), 1000);
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      const msg = errors ? Object.values(errors).flat().join("\n") : e.response?.data?.message || "Error saving holiday.";
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteHoliday = async (id: number) => {
    if (!confirm("Delete this holiday?")) return;
    try {
      await api.delete(`/holidays/${id}`);
      fetchHolidays();
    } catch (e: any) {
      alert(e.response?.data?.message || "Error deleting holiday.");
    }
  };

  const fmtDate = (d: string) => {
    try { return format(new Date(d + "T00:00:00"), "EEE, dd MMM yyyy"); }
    catch { return d; }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500 dark:text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <CalendarDays className="w-7 h-7 text-amber-400" /> Holiday Management
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1">Configure company holidays and weekend working day overrides.</p>
        </div>
        {activeTab === "holidays" ? (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Add Holiday
          </button>
        ) : (
          <button
            onClick={openNewOverride}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-colors self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Mark Weekend as Working
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("holidays")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "holidays"
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          Company Holidays ({holidays.length})
        </button>
        <button
          onClick={() => setActiveTab("overrides")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "overrides"
              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          Working Weekend Overrides ({overrides.length})
        </button>
      </div>

      {activeTab === "holidays" ? (
        <div className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-md overflow-hidden">
          {holidays.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 space-y-3">
              <CalendarDays className="w-10 h-10 mx-auto text-slate-600" />
              <p>No holidays configured yet.</p>
              <button onClick={openNew} className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2">
                Add the first holiday
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm text-left">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Holiday Name</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {holidays.map((h: any) => (
                    <tr key={h.id} className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300 break-words whitespace-normal leading-tight font-mono text-xs">
                        {fmtDate(h.date)}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">{h.name}</td>
                      <td className="px-3 py-3"><TypeBadge type={h.type} /></td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">{h.description || "—"}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(h)}
                            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteHoliday(h.id)}
                            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-md overflow-hidden">
          {overrides.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 space-y-3">
              <CalendarDays className="w-10 h-10 mx-auto text-purple-400" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">No working weekend overrides configured.</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                By default, all Saturdays and Sundays are treated as holidays. Add an override if employees need to work on a specific weekend (e.g. compensatory working day).
              </p>
              <button onClick={openNewOverride} className="text-sm text-purple-600 dark:text-purple-400 hover:underline font-semibold">
                Mark a weekend as working day
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm text-left">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Day</th>
                    <th className="px-3 py-3">Reason / Description</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {overrides.map((o: any) => {
                    let dayName = "";
                    try {
                      dayName = format(new Date(o.date + "T00:00:00"), "EEEE");
                    } catch {}
                    return (
                      <tr key={o.id} className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">
                          {fmtDate(o.date)}
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300">
                            {dayName || "Weekend"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-800 dark:text-slate-200 font-medium">
                          {o.reason || "Working Day"}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => deleteOverride(o.id)}
                            title="Revert to Holiday"
                            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Holiday Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader className="mb-1">
            <DialogTitle>{editId ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {editId ? "Update details for this holiday." : "Add a new holiday to the calendar."}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Holiday Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Republic Day"
                className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Holiday Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 transition-colors"
              >
                {HOLIDAY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Description <span className="text-slate-500 normal-case font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes..."
                className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-500 resize-none transition-colors"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-slate-200 dark:border-white/10 pt-4 flex gap-3 justify-end">
            <button
              onClick={() => setShowDialog(false)}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
                Cancel
              </button>
              <button
                onClick={saveHoliday}
                disabled={actionLoading || !name || !date || !type}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {editId ? "Update Holiday" : "Save Holiday"}
              </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Weekend Override Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader className="mb-1">
            <DialogTitle>Mark Weekend as Working Day</DialogTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select a Saturday or Sunday to designate as an official working day.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Weekend Date *
              </label>
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Reason / Note *
              </label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Compensatory working day for Friday holiday"
                className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-500 placeholder:text-slate-500 transition-colors"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-slate-200 dark:border-white/10 pt-4 flex gap-3 justify-end">
            <button
              onClick={() => setShowOverrideDialog(false)}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveOverride}
              disabled={actionLoading || !overrideDate}
              className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Save Working Day
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {}} />
          <div className="relative w-full max-w-md bg-gradient-to-br from-white dark:from-slate-800 to-slate-50 dark:to-slate-900 border border-emerald-500/20 rounded-md shadow-2xl z-10 overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 animate-pulse" />

            <div className="relative px-6 py-8 text-center space-y-4">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center animate-bounce">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
              </div>

              {/* Success Message */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{successMessage}</h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm">The holiday calendar has been updated automatically.</p>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setShowSuccess(false)}
                className="w-full mt-6 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
