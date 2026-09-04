"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, Trash2, Edit, Loader2, CheckCircle, Sparkles } from "lucide-react";
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
  {
    value: "National Holiday",
    label: "National Holiday",
    cls: "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
  },
  {
    value: "Festival Holiday",
    label: "Festival Holiday",
    cls: "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
  },
  {
    value: "Company Holiday",
    label: "Company Holiday",
    cls: "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  {
    value: "Optional Holiday",
    label: "Optional Holiday",
    cls: "bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30",
  },
];

function TypeBadge({ type }: { type: string }) {
  const t = HOLIDAY_TYPES.find((x) => x.value === type) ?? {
    cls: "bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    label: type,
  };
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md shadow-2xs ${t.cls}`}>
      {t.label}
    </span>
  );
}

export default function HolidaysPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "Super Admin" || user?.role === "HR";

  const [holidays, setHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [seedingLoading, setSeedingLoading] = useState(false);
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

  const seedKeralaHolidays = async () => {
    if (
      !confirm(
        "This will pre-populate the official Kerala Bank & Public Holidays (2026) such as Christmas, Gandhi Jayanthi, Vishu, Onam, Bakrid, etc. Proceed?"
      )
    ) {
      return;
    }

    setSeedingLoading(true);
    try {
      const res = await api.post("/holidays/seed-kerala");
      const msg = res.data?.message || "Kerala bank holidays processed successfully!";
      setSuccessMessage(msg);
      setShowSuccess(true);
      fetchHolidays();
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join("\n")
        : e.response?.data?.message || "Error adding Kerala holidays.";
      alert(msg);
    } finally {
      setSeedingLoading(false);
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
      const msg = errors
        ? Object.values(errors).flat().join("\n")
        : e.response?.data?.message || "Error saving override.";
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
    setName("");
    setDate("");
    setType("National Holiday");
    setDescription("");
    setShowDialog(true);
  };

  const openEdit = (h: any) => {
    setEditId(h.id);
    setName(h.name);
    setDate(h.date);
    setType(h.type || "National Holiday");
    setDescription(h.description || "");
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
        setHolidays(holidays.map((h) => (h.id === editId ? { ...h, ...payload } : h)));
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
      const msg = errors
        ? Object.values(errors).flat().join("\n")
        : e.response?.data?.message || "Error saving holiday.";
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
    try {
      return format(new Date(d + "T00:00:00"), "EEE, dd MMM yyyy");
    } catch {
      return d;
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-amber-500" /> Holiday Management
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1">
            Configure company holidays and weekend working day overrides.
          </p>
        </div>
        {activeTab === "holidays" ? (
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            <button
              onClick={seedKeralaHolidays}
              disabled={seedingLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-xs disabled:opacity-50"
              title="Pre-add Indian Bank & Public Holidays following the official Kerala calendar (Christmas, Gandhi Jayanthi, Onam, etc.)"
            >
              {seedingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>Pre-add Kerala Holidays</span>
            </button>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-all shadow-xs"
            >
              <Plus className="h-4 w-4" /> Add Holiday
            </button>
          </div>
        ) : (
          <button
            onClick={openNewOverride}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-all shadow-xs self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Mark Weekend as Working
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2.5 pb-1">
        <button
          onClick={() => setActiveTab("holidays")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "holidays"
              ? "bg-amber-500 text-white shadow-xs"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60"
          }`}
        >
          <span>Company Holidays</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === "holidays"
                ? "bg-white/25 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            {holidays.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("overrides")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "overrides"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60"
          }`}
        >
          <span>Working Weekend Overrides</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === "overrides"
                ? "bg-white/25 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            {overrides.length}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "holidays" ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          {holidays.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 space-y-4">
              <CalendarDays className="w-12 h-12 mx-auto text-amber-500/70" />
              <div className="space-y-1">
                <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  No holidays configured yet.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Add holidays manually or click below to populate official Kerala Bank Holidays automatically.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={seedKeralaHolidays}
                  disabled={seedingLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Pre-add Kerala Holidays
                </button>
                <button
                  onClick={openNew}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                >
                  Add Manually
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm text-left">
                <thead className="text-xs font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Holiday Name</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {holidays.map((h: any) => (
                    <tr
                      key={h.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-200 font-semibold text-xs font-mono whitespace-nowrap">
                        {fmtDate(h.date)}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                        {h.name}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <TypeBadge type={h.type} />
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300 text-sm max-w-xs truncate">
                        {h.description || "—"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(h)}
                            title="Edit Holiday"
                            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 border border-slate-200 dark:border-slate-700/60 hover:border-amber-300 dark:hover:border-amber-500/30 transition-all shadow-2xs"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteHoliday(h.id)}
                            title="Delete Holiday"
                            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-slate-700/60 hover:border-rose-300 dark:hover:border-rose-500/30 transition-all shadow-2xs"
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          {overrides.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 space-y-3">
              <CalendarDays className="w-10 h-10 mx-auto text-purple-500" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                No working weekend overrides configured.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                By default, all Saturdays and Sundays are treated as holidays. Add an override if employees need to work
                on a specific weekend (e.g. compensatory working day).
              </p>
              <button
                onClick={openNewOverride}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline font-semibold"
              >
                Mark a weekend as working day
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm text-left">
                <thead className="text-xs font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Day</th>
                    <th className="px-5 py-3.5">Reason / Description</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {overrides.map((o: any) => {
                    let dayName = "";
                    try {
                      dayName = format(new Date(o.date + "T00:00:00"), "EEEE");
                    } catch {}
                    return (
                      <tr
                        key={o.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-5 py-4 text-slate-700 dark:text-slate-200 font-mono text-xs font-semibold whitespace-nowrap">
                          {fmtDate(o.date)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                            {dayName || "Weekend"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-800 dark:text-slate-200 font-medium">
                          {o.reason || "Working Day"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => deleteOverride(o.id)}
                            title="Revert to Holiday"
                            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-slate-700/60 hover:border-rose-300 dark:hover:border-rose-500/20 transition-all shadow-2xs"
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
        <DialogContent className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <DialogHeader className="mb-1">
            <DialogTitle>{editId ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {editId ? "Update details for this holiday." : "Add a new holiday to the calendar."}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Holiday Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Christmas"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Holiday Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 transition-colors"
              >
                {HOLIDAY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Description <span className="text-slate-400 normal-case font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-400 resize-none transition-colors"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-slate-200 dark:border-slate-800 pt-4 flex gap-3 justify-end">
            <button
              onClick={() => setShowDialog(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveHoliday}
              disabled={actionLoading || !name || !date || !type}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {editId ? "Update Holiday" : "Save Holiday"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Weekend Override Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <DialogHeader className="mb-1">
            <DialogTitle>Mark Weekend as Working Day</DialogTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select a Saturday or Sunday to designate as an official working day.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Weekend Date *
              </label>
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Reason / Note *
              </label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Compensatory working day for Friday holiday"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-500 placeholder:text-slate-400 transition-colors"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-slate-200 dark:border-slate-800 pt-4 flex gap-3 justify-end">
            <button
              onClick={() => setShowOverrideDialog(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveOverride}
              disabled={actionLoading || !overrideDate}
              className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSuccess(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl z-10 overflow-hidden">
            <div className="relative px-6 py-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center animate-bounce">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{successMessage}</h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  The holiday calendar has been updated automatically.
                </p>
              </div>

              <button
                onClick={() => setShowSuccess(false)}
                className="w-full mt-6 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-md shadow-emerald-600/20"
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
