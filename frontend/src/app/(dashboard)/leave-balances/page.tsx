"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";
import {
  Shield, Edit2, X, CheckCircle, ChevronDown, ChevronUp,
  RefreshCw, Users, ClipboardList, Loader2
} from "lucide-react";
import { format, parseISO } from "date-fns";

/* ─── Types ────────────────────────────────────────────── */
interface EmployeeBalance {
  user_id: number;
  name: string;
  employee_code: string;
  designation: string;
  casual_leave_balance: number;
  cl_carry_forward: number;
  cl_carry_forward_year: number | null;
  sick_leave_balance: number;
  total_leaves_taken: number;
}

interface AuditLog {
  id: number;
  user: { id: number; first_name: string; last_name: string; employee_code: string };
  modifier: { id: number; first_name: string; last_name: string };
  leave_type: string;
  previous_balance: number;
  new_balance: number;
  remarks: string | null;
  created_at: string;
}

/* ─── Edit Modal ────────────────────────────────────────── */
function EditModal({
  employee,
  onClose,
  onSaved,
}: {
  employee: EmployeeBalance;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cl, setCl] = useState(employee.casual_leave_balance.toString());
  const [cf, setCf] = useState(employee.cl_carry_forward.toString());
  const [sl, setSl] = useState(employee.sick_leave_balance.toString());
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api.post(`/leave-balances/${employee.user_id}`, {
        casual_leave_balance: parseFloat(cl),
        cl_carry_forward: parseFloat(cf),
        sick_leave_balance: parseFloat(sl),
        remarks: remarks || undefined,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{employee.name}</h2>
            <p className="text-xs text-slate-500">{employee.employee_code} · {employee.designation}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {/* CL */}
          <div className="bg-amber-50 rounded-xl p-4">
            <label className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2 block">
              Casual Leave (Current Year)
            </label>
            <input
              type="number" min="0" max="365" step="0.5"
              value={cl}
              onChange={(e) => setCl(e.target.value)}
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* CL Carry Forward */}
          <div className="bg-orange-50 rounded-xl p-4">
            <label className="text-xs font-bold uppercase tracking-wider text-orange-700 mb-2 block">
              CL Carry Forward {employee.cl_carry_forward_year ? `(from ${employee.cl_carry_forward_year})` : ""}
            </label>
            <input
              type="number" min="0" max="365" step="0.5"
              value={cf}
              onChange={(e) => setCf(e.target.value)}
              className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* SL */}
          <div className="bg-blue-50 rounded-xl p-4">
            <label className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2 block">
              Sick Leave
            </label>
            <input
              type="number" min="0" max="365" step="0.5"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
              Remarks (Optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Reason for manual adjustment..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function LeaveBalancesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [employees, setEmployees] = useState<EmployeeBalance[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAudit, setShowAudit] = useState(false);
  const [editing, setEditing] = useState<EmployeeBalance | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user?.role !== "Super Admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const balRes = await api.get("/leave-balances");
      setEmployees(balRes.data.data || []);
    } catch (e) {
      console.error("Failed to load employee balances:", e);
    }
    try {
      const logRes = await api.get("/leave-balance-audit-logs");
      setAuditLogs(logRes.data.data?.data || []);
    } catch (e) {
      // Audit log table may not exist yet (migration pending)
      console.warn("Audit log not available yet:", e);
    }
    setLoading(false);
  }, []);


  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_code?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-amber-400" />
            Leave Balance Management
          </h1>
          <p className="text-slate-400 mt-1">View and manually adjust leave balances for all employees.</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or employee code..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md bg-white/10 border border-white/20 text-white placeholder:text-slate-400 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />

      {/* Employee Balance Table */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <Users className="w-5 h-5 text-amber-400" />
          <h2 className="text-white font-bold text-lg">Employee Balances ({filtered.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Employee</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-amber-400">CL Balance</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-orange-400">CL Carry Fwd</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-blue-400">SL Balance</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Total Used</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">No employees found.</td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.user_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-white font-semibold text-sm">{emp.name}</p>
                      <p className="text-slate-400 text-xs">{emp.employee_code} · {emp.designation || "—"}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block bg-amber-500/20 text-amber-300 font-bold text-sm px-3 py-1 rounded-full">
                        {emp.casual_leave_balance}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block bg-orange-500/20 text-orange-300 font-bold text-sm px-3 py-1 rounded-full">
                        {emp.cl_carry_forward}
                        {emp.cl_carry_forward_year && <span className="text-xs ml-1 opacity-70">({emp.cl_carry_forward_year})</span>}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block bg-blue-500/20 text-blue-300 font-bold text-sm px-3 py-1 rounded-full">
                        {emp.sick_leave_balance}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-slate-300 font-semibold text-sm">{emp.total_leaves_taken}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => setEditing(emp)}
                        className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Section */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowAudit(!showAudit)}
          className="w-full flex items-center justify-between px-6 py-4 border-b border-white/10 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-blue-400" />
            <h2 className="text-white font-bold text-lg">Audit Log ({auditLogs.length} recent entries)</h2>
          </div>
          {showAudit ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {showAudit && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Leave Type</th>
                  <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Previous</th>
                  <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Updated</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Modified By</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">No audit entries yet.</td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-3 text-white text-sm font-medium">
                        {log.user?.first_name} {log.user?.last_name}
                        <span className="text-slate-400 text-xs ml-1">({log.user?.employee_code})</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          log.leave_type.includes('Sick') ? 'bg-blue-500/20 text-blue-300' :
                          log.leave_type.includes('Carry') ? 'bg-orange-500/20 text-orange-300' :
                          'bg-amber-500/20 text-amber-300'
                        }`}>{log.leave_type}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300 font-mono text-sm">{log.previous_balance}</td>
                      <td className="px-4 py-3 text-center font-bold font-mono text-sm">
                        <span className={log.new_balance > log.previous_balance ? 'text-green-400' : 'text-red-400'}>
                          {log.new_balance}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm">
                        {log.modifier?.first_name} {log.modifier?.last_name}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {log.created_at ? format(parseISO(log.created_at), "dd MMM yyyy, hh:mm a") : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-[160px] truncate">
                        {log.remarks || <span className="italic opacity-50">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <EditModal
          employee={editing}
          onClose={() => setEditing(null)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
