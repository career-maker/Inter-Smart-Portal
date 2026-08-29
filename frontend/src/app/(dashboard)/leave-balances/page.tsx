"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuthStore } from "@/store/auth";
import leavePolicyApi, {
  PolicyEmployee,
  LeavePolicySettings,
  CycleInfo,
} from "@/services/leavePolicy";
import {
  Shield,
  Edit2,
  X,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Users,
  ClipboardList,
  Loader2,
  CalendarCheck,
  Settings2,
  Search,
  Check,
  Clock,
  Sparkles,
  Save,
  Sliders,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function LeaveBalancesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [employees, setEmployees] = useState<PolicyEmployee[]>([]);
  const [settings, setSettings] = useState<LeavePolicySettings | null>(null);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit / Adjust Modal State
  const [adjustingEmployee, setAdjustingEmployee] = useState<PolicyEmployee | null>(null);
  const [adjCL, setAdjCL] = useState<string>("");
  const [adjCF, setAdjCF] = useState<string>("");
  const [adjSL, setAdjSL] = useState<string>("");
  const [adjRemarks, setAdjRemarks] = useState<string>("");
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  // Configure Policy Override Modal State
  const [configuringEmployee, setConfiguringEmployee] = useState<PolicyEmployee | null>(null);
  const [customCL, setCustomCL] = useState<string>("");
  const [customSL, setCustomSL] = useState<string>("");
  const [customProbation, setCustomProbation] = useState<string>("");
  const [customNotes, setCustomNotes] = useState<string>("");
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (user && user.role !== "Super Admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [empRes, setRes] = await Promise.all([
        leavePolicyApi.getEmployees(),
        leavePolicyApi.getSettings(),
      ]);
      setEmployees(empRes.employees || []);
      setSettings(setRes.settings);
      setCycleInfo(setRes.cycle_info);
    } catch (e: any) {
      console.error("Failed to load employee balances:", e);
      setError(e?.response?.data?.message || e?.message || "Failed to load employee balances.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Adjust Balance Modal
  const handleOpenAdjust = (emp: PolicyEmployee) => {
    setAdjustingEmployee(emp);
    setAdjCL(String(emp.casual_leave_balance));
    setAdjCF(String(emp.cl_carry_forward));
    setAdjSL(String(emp.sick_leave_balance));
    setAdjRemarks("");
  };

  // Save Manual Adjustment
  const handleSaveAdjustment = async () => {
    if (!adjustingEmployee) return;
    setSavingAdjustment(true);
    setError(null);

    try {
      const res = await leavePolicyApi.adjustBalance(adjustingEmployee.id, {
        casual_leave_balance: Number(adjCL),
        cl_carry_forward: Number(adjCF),
        sick_leave_balance: Number(adjSL),
        remarks: adjRemarks || undefined,
      });

      setSuccessMessage(res.message);
      setAdjustingEmployee(null);
      // Refresh list
      const empRes = await leavePolicyApi.getEmployees();
      setEmployees(empRes.employees || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to adjust balance.");
    } finally {
      setSavingAdjustment(false);
    }
  };

  // Open Configure Override Modal
  const handleOpenConfigure = (emp: PolicyEmployee) => {
    setConfiguringEmployee(emp);
    setCustomCL(emp.custom_monthly_cl !== null ? String(emp.custom_monthly_cl) : "");
    setCustomSL(emp.custom_monthly_sl !== null ? String(emp.custom_monthly_sl) : "");
    setCustomProbation(emp.custom_probation_months !== null ? String(emp.custom_probation_months) : "");
    setCustomNotes("");
  };

  // Save Configure Override
  const handleSaveConfigure = async () => {
    if (!configuringEmployee) return;
    setSavingConfig(true);
    setError(null);

    try {
      const res = await leavePolicyApi.updateEmployeePolicy(configuringEmployee.id, {
        custom_monthly_cl: customCL === "" ? null : Number(customCL),
        custom_monthly_sl: customSL === "" ? null : Number(customSL),
        custom_probation_months: customProbation === "" ? null : Number(customProbation),
        notes: customNotes || undefined,
      });

      setSuccessMessage(res.message);
      setConfiguringEmployee(null);
      // Refresh list
      const empRes = await leavePolicyApi.getEmployees();
      setEmployees(empRes.employees || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update employee override.");
    } finally {
      setSavingConfig(false);
    }
  };

  // Clear Probation directly
  const handleClearProbation = async (emp: PolicyEmployee) => {
    if (
      !confirm(
        `Are you sure you want to mark probation as cleared for ${emp.name}? This will immediately make them eligible for automatic monthly leave allocations.`
      )
    ) {
      return;
    }

    try {
      const res = await leavePolicyApi.clearProbation(emp.id);
      setSuccessMessage(res.message);
      const empRes = await leavePolicyApi.getEmployees();
      setEmployees(empRes.employees || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to clear probation.");
    }
  };

  // Filtered employees
  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        !search ||
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "in_probation") return emp.is_in_probation;
      if (statusFilter === "completed") return !emp.is_in_probation && !emp.probation_cleared_manually;
      if (statusFilter === "cleared_manually") return emp.probation_cleared_manually;
      if (statusFilter === "custom_allocation") return emp.has_custom_allocation;

      return true;
    });
  }, [employees, search, statusFilter]);

  const inProbationCount = employees.filter((e) => e.is_in_probation).length;
  const clearedManuallyCount = employees.filter((e) => e.probation_cleared_manually).length;
  const customAllocCount = employees.filter((e) => e.has_custom_allocation).length;

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Leave & WFH</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white">Leave Balances</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-[#56348f]" />
            <span>Leave Balance Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View live leave balances, probation clearance status, and configure employee-wise monthly allocations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Link to Leave Policy Management */}
          <Link
            href="/project-management/addons/leave-policy"
            style={{
              backgroundColor: "#56348f",
              color: "rgb(255, 255, 255)",
              fontFamily: '"Proxima Nova", sans-serif',
              fontSize: "12px",
              fontWeight: 600,
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Settings2 className="w-4 h-4 !text-white" />
            <span className="!text-white">Leave Policy Settings</span>
          </Link>

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#56348f]" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Status Banners ── */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* ── Filter and Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 outline-none"
          />
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-[#56348f] text-white border-[#56348f]"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-purple-300"
            }`}
          >
            All ({employees.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("in_probation")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              statusFilter === "in_probation"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-300"
            }`}
          >
            In Probation ({inProbationCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("cleared_manually")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              statusFilter === "cleared_manually"
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-purple-300"
            }`}
          >
            Cleared Manually ({clearedManuallyCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("custom_allocation")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              statusFilter === "custom_allocation"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
            }`}
          >
            Custom Quota ({customAllocCount})
          </button>
        </div>
      </div>

      {/* ── Employee Balances Table (Matching Leave Policy UI) ── */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Joining Date</th>
                <th className="py-3.5 px-4">Probation Status</th>
                <th className="py-3.5 px-4">Current Balances</th>
                <th className="py-3.5 px-4">Monthly Quota</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No employees match the selected criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => {
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Name & Code */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>{emp.employee_code}</span>
                          <span>•</span>
                          <span>{emp.designation}</span>
                        </div>
                      </td>

                      {/* Joining Date */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {emp.joining_date ? emp.joining_date : <span className="text-slate-400 italic">Not set</span>}
                      </td>

                      {/* Probation Status */}
                      <td className="py-3 px-4">
                        {emp.probation_cleared_manually ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            Cleared Manually
                          </span>
                        ) : emp.is_in_probation ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                              <Clock className="w-3 h-3 text-amber-500" />
                              In Probation ({emp.days_remaining}d left)
                            </span>
                            <div className="text-[10px] text-slate-400">Ends: {emp.probation_end_date}</div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                            <Check className="w-3 h-3 text-emerald-500" />
                            Completed
                          </span>
                        )}
                      </td>

                      {/* Current Balances */}
                      <td className="py-3 px-4">
                        <div className="text-slate-900 dark:text-white font-semibold flex items-center gap-2">
                          <span className="text-purple-600 dark:text-purple-400" title="Casual Leave (Total Available)">
                            {emp.casual_leave_balance + emp.cl_carry_forward} CL
                          </span>
                          <span className="text-slate-300">/</span>
                          <span className="text-rose-600 dark:text-rose-400" title="Sick Leave">
                            {emp.sick_leave_balance} SL
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{emp.casual_leave_balance} Regular</span>
                          {emp.cl_carry_forward > 0 ? (
                            <span className="text-purple-600 dark:text-purple-400 font-semibold"> + {emp.cl_carry_forward} Carry-Fwd</span>
                          ) : (
                            <span className="text-slate-400"> + 0 CF</span>
                          )}
                        </div>
                      </td>

                      {/* Monthly Quota */}
                      <td className="py-3 px-4">
                        {emp.has_custom_allocation ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-purple-700 dark:text-purple-300">
                              +{emp.effective_monthly_cl} CL / +{emp.effective_monthly_sl} SL
                            </span>
                            <span className="block text-[10px] font-semibold text-purple-500">Custom override</span>
                          </div>
                        ) : (
                          <div className="text-slate-600 dark:text-slate-400">
                            +{emp.effective_monthly_cl} CL / +{emp.effective_monthly_sl} SL (Default)
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {emp.is_in_probation && !emp.probation_cleared_manually && (
                            <button
                              type="button"
                              onClick={() => handleClearProbation(emp)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold cursor-pointer"
                              title="Clear probation now to enable auto-allocation"
                            >
                              Clear Probation
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenAdjust(emp)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer"
                            title="Adjust balance manually without breaking auto allocations"
                          >
                            Adjust
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenConfigure(emp)}
                            style={{
                              backgroundColor: "#56348f",
                              color: "rgb(255, 255, 255)",
                              fontFamily: '"Proxima Nova", sans-serif',
                              fontSize: "11px",
                              fontWeight: 600,
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#56348f] hover:bg-[#462875] !text-white text-[11px] font-bold cursor-pointer"
                          >
                            Configure
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: MANUAL BALANCE ADJUSTMENT ── */}
      {adjustingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Manual Leave Balance Adjustment: {adjustingEmployee.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Directly adjust balances. If in probation, this will also clear probation and start future automatic monthly allocations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingEmployee(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-purple-700 dark:text-purple-300">
                    Casual Leave (Current)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={adjCL}
                    onChange={(e) => setAdjCL(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-purple-700 dark:text-purple-300">
                    CL Carry Forward
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={adjCF}
                    onChange={(e) => setAdjCF(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-rose-700 dark:text-rose-300">
                    Sick Leave (SL)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={adjSL}
                    onChange={(e) => setAdjSL(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Adjustment Remarks / Audit Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={adjRemarks}
                  onChange={(e) => setAdjRemarks(e.target.value)}
                  placeholder="e.g. Initial balance correction, or manual leaves granted"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAdjustingEmployee(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAdjustment}
                disabled={savingAdjustment}
                style={{
                  backgroundColor: "#56348f",
                  color: "rgb(255, 255, 255)",
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: "12px",
                  fontWeight: 600,
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {savingAdjustment ? <Loader2 className="w-3.5 h-3.5 animate-spin !text-white" /> : <Check className="w-3.5 h-3.5 !text-white" />}
                <span className="!text-white">Save Balance Adjustment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIGURE EMPLOYEE OVERRIDE ── */}
      {configuringEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Configure Leave Policy: {configuringEmployee.name}
                </h3>
                <p className="text-xs text-slate-400">{configuringEmployee.employee_code} • {configuringEmployee.designation}</p>
              </div>
              <button
                type="button"
                onClick={() => setConfiguringEmployee(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Custom Monthly CL (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    placeholder={`Default (${settings?.default_monthly_cl ?? 1})`}
                    value={customCL}
                    onChange={(e) => setCustomCL(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Custom Monthly SL (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    placeholder={`Default (${settings?.default_monthly_sl ?? 1})`}
                    value={customSL}
                    onChange={(e) => setCustomSL(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Custom Probation Period in Months (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  placeholder={`Default (${settings?.probation_period_months ?? 6})`}
                  value={customProbation}
                  onChange={(e) => setCustomProbation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
                <p className="text-[10px] text-slate-400">Leave blank to use the common company probation period.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Internal Notes / Reason
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Contractual agreement for 2 CL per month"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfiguringEmployee(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfigure}
                disabled={savingConfig}
                style={{
                  backgroundColor: "#56348f",
                  color: "rgb(255, 255, 255)",
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: "12px",
                  fontWeight: 600,
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {savingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin !text-white" /> : <Save className="w-3.5 h-3.5 !text-white" />}
                <span className="!text-white">Save Override</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
