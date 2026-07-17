"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, Trash2, Edit, Loader2, CheckCircle } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";

const HOLIDAY_TYPES = [
  { value: "National Holiday",  label: "National Holiday",  cls: "bg-blue-500/20 text-blue-300" },
  { value: "Festival Holiday",  label: "Festival Holiday",  cls: "bg-amber-500/20 text-amber-300" },
  { value: "Company Holiday",   label: "Company Holiday",   cls: "bg-emerald-500/20 text-emerald-300" },
  { value: "Optional Holiday",  label: "Optional Holiday",  cls: "bg-purple-500/20 text-purple-300" },
];

function TypeBadge({ type }: { type: string }) {
  const t = HOLIDAY_TYPES.find((x) => x.value === type) ?? { cls: "bg-white/10 text-muted-foreground", label: type };
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <CalendarDays className="w-7 h-7 text-amber-400" /> Holiday Management
          </h1>
          <p className="text-muted-foreground mt-1">Configure the company's annual holiday calendar.</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Holiday
        </button>
      </div>

      <div className="bg-white/5 border border-border rounded-2xl overflow-hidden">
        {holidays.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-3">
            <CalendarDays className="w-10 h-10 mx-auto text-slate-600" />
            <p>No holidays configured yet.</p>
            <button onClick={openNew} className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2">
              Add the first holiday
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-border">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Holiday Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {holidays.map((h: any) => (
                  <tr key={h.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap font-mono text-xs">
                      {fmtDate(h.date)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">{h.name}</td>
                    <td className="px-6 py-4"><TypeBadge type={h.type} /></td>
                    <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">{h.description || "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(h)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteHoliday(h.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
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

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDialog(false)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl z-10">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{editId ? "Edit Holiday" : "Add Holiday"}</h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                {editId ? "Update details for this holiday." : "Add a new holiday to the calendar."}
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Holiday Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Republic Day"
                  className="w-full bg-slate-700 border border-border text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-700 border border-border text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Holiday Type *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-slate-700 border border-border text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 transition-colors"
                >
                  {HOLIDAY_TYPES.map((t) => (
                    <option key={t.value} value={t.value} className="bg-slate-700">
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Description <span className="text-slate-500 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional notes..."
                  className="w-full bg-slate-700 border border-border text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-500 resize-none transition-colors"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-xl hover:bg-white/5 transition-colors"
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
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {}} />
          <div className="relative w-full max-w-md bg-gradient-to-br from-slate-800 to-slate-900 border border-emerald-500/20 rounded-2xl shadow-2xl z-10 overflow-hidden">
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
                <h2 className="text-2xl font-bold text-foreground">{successMessage}</h2>
                <p className="text-muted-foreground text-sm">The holiday calendar has been updated automatically.</p>
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
