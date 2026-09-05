"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Settings2,
  Users,
  History,
  PlayCircle,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Save,
  Check,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  Edit3,
  Sliders,
  Layers,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import leavePolicyApi, {
  LeavePolicySettings,
  CycleInfo,
  PolicyEmployee,
  LedgerEntry,
} from "@/services/leavePolicy";

type TabKey = "general" | "employees" | "ledger" | "simulator";

export default function LeavePolicyManagementPage() {
  const { user } = useAuthStore();
  const userRoleStr = (user?.role || "").toLowerCase();
  const isSuperAdmin = userRoleStr === "super admin";

  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Core Data
  const [settings, setSettings] = useState<LeavePolicySettings>({
    monthly_cycle_start_day: 26,
    probation_period_months: 6,
    default_monthly_cl: 1.0,
    default_monthly_sl: 1.0,
    cl_carry_forward_years: 2,
    sl_carry_forward_allowed: false,
    cl_advance_notice_days: 3,
    wfh_morning_cutoff_time: "09:45",
    wfh_afternoon_cutoff_time: "14:30",
    late_threshold_time: "09:40",
    single_day_approval_level: "tl_only",
    multi_day_approval_threshold: 2,
    lop_admin_approval_required: true,
  });
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [employees, setEmployees] = useState<PolicyEmployee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState("all");

  // Ledger state
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  const [ledgerFilterType, setLedgerFilterType] = useState("");

  // Modals state
  const [editingEmployee, setEditingEmployee] = useState<PolicyEmployee | null>(null);
  const [customCL, setCustomCL] = useState<string>("");
  const [customSL, setCustomSL] = useState<string>("");
  const [customProbation, setCustomProbation] = useState<string>("");
  const [customNotes, setCustomNotes] = useState<string>("");
  const [savingEmployeePolicy, setSavingEmployeePolicy] = useState(false);

  // Manual Adjustment Modal State
  const [adjustingEmployee, setAdjustingEmployee] = useState<PolicyEmployee | null>(null);
  const [adjCL, setAdjCL] = useState<string>("");
  const [adjCF, setAdjCF] = useState<string>("");
  const [adjSL, setAdjSL] = useState<string>("");
  const [adjRemarks, setAdjRemarks] = useState<string>("");
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  // Simulator / Manual Run State
  const [simDate, setSimDate] = useState("");
  const [simForce, setSimForce] = useState(false);
  const [runningSimulator, setRunningSimulator] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Fetch initial data
  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [settingsRes, employeesRes] = await Promise.all([
        leavePolicyApi.getSettings(),
        leavePolicyApi.getEmployees(),
      ]);

      setSettings(settingsRes.settings);
      setCycleInfo(settingsRes.cycle_info);
      setEmployees(employeesRes.employees || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load leave policy configuration.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchLedger = useCallback(async (page = 1) => {
    setLedgerLoading(true);
    try {
      const res = await leavePolicyApi.getLedger({
        page,
        transaction_type: ledgerFilterType || undefined,
      });
      setLedgerEntries(res.data?.data || []);
      setLedgerPage(res.data?.current_page || 1);
      setLedgerTotalPages(res.data?.last_page || 1);
    } catch (err: any) {
      console.error("Failed to load audit ledger", err);
    } finally {
      setLedgerLoading(false);
    }
  }, [ledgerFilterType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "ledger") {
      fetchLedger(1);
    }
  }, [activeTab, fetchLedger]);

  // Handle Save Global Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await leavePolicyApi.updateSettings({
        monthly_cycle_start_day: Number(settings.monthly_cycle_start_day),
        probation_period_months: Number(settings.probation_period_months),
        default_monthly_cl: Number(settings.default_monthly_cl),
        default_monthly_sl: Number(settings.default_monthly_sl),
        cl_carry_forward_years: Number(settings.cl_carry_forward_years),
        sl_carry_forward_allowed: Boolean(settings.sl_carry_forward_allowed),
        cl_advance_notice_days: Number(settings.cl_advance_notice_days ?? 3),
        wfh_morning_cutoff_time: settings.wfh_morning_cutoff_time || "09:45",
        wfh_afternoon_cutoff_time: settings.wfh_afternoon_cutoff_time || "14:30",
        late_threshold_time: settings.late_threshold_time || "09:40",
        single_day_approval_level: settings.single_day_approval_level || "tl_only",
        multi_day_approval_threshold: Number(settings.multi_day_approval_threshold ?? 2),
        lop_admin_approval_required: Boolean(settings.lop_admin_approval_required ?? true),
      });

      setSettings(res.settings);
      setCycleInfo(res.cycle_info);
      setSuccessMessage(res.message || "Global leave policy saved successfully.");
      // Refresh employees list to recalculate effective values
      const empRes = await leavePolicyApi.getEmployees();
      setEmployees(empRes.employees || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Open Edit Employee Override Modal
  const handleOpenEditEmployee = (emp: PolicyEmployee) => {
    setEditingEmployee(emp);
    setCustomCL(emp.custom_monthly_cl !== null ? String(emp.custom_monthly_cl) : "");
    setCustomSL(emp.custom_monthly_sl !== null ? String(emp.custom_monthly_sl) : "");
    setCustomProbation(emp.custom_probation_months !== null ? String(emp.custom_probation_months) : "");
    setCustomNotes("");
  };

  // Save Employee Override
  const handleSaveEmployeePolicy = async () => {
    if (!editingEmployee) return;
    setSavingEmployeePolicy(true);
    setError(null);

    try {
      const res = await leavePolicyApi.updateEmployeePolicy(editingEmployee.id, {
        custom_monthly_cl: customCL === "" ? null : Number(customCL),
        custom_monthly_sl: customSL === "" ? null : Number(customSL),
        custom_probation_months: customProbation === "" ? null : Number(customProbation),
        notes: customNotes || undefined,
      });

      setSuccessMessage(res.message);
      setEditingEmployee(null);
      // Refresh list
      const empRes = await leavePolicyApi.getEmployees();
      setEmployees(empRes.employees || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update employee override.");
    } finally {
      setSavingEmployeePolicy(false);
    }
  };

  // Clear Probation for an employee directly
  const handleClearProbation = async (emp: PolicyEmployee) => {
    if (!confirm(`Are you sure you want to mark probation as cleared for ${emp.name}? This will immediately make them eligible for automatic monthly leave allocations.`)) {
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

  // Open Manual Balance Adjustment Modal
  const handleOpenAdjustBalance = (emp: PolicyEmployee) => {
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
      // Refresh employee list
      const empRes = await leavePolicyApi.getEmployees();
      setEmployees(empRes.employees || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to adjust balance.");
    } finally {
      setSavingAdjustment(false);
    }
  };

  // Trigger Policy Simulation
  const handleRunSimulator = async () => {
    setRunningSimulator(true);
    setError(null);
    setSimulationResult(null);

    try {
      const res = await leavePolicyApi.triggerCycle({
        force: simForce,
        date: simDate || undefined,
      });

      setSimulationResult(res.result);
      setSuccessMessage(res.message);
      // Refresh employees and cycle info
      const [settingsRes, empRes] = await Promise.all([
        leavePolicyApi.getSettings(),
        leavePolicyApi.getEmployees(),
      ]);
      setCycleInfo(settingsRes.cycle_info);
      setEmployees(empRes.employees || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Simulation execution failed.");
    } finally {
      setRunningSimulator(false);
    }
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        !employeeSearch ||
        emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.email.toLowerCase().includes(employeeSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (employeeStatusFilter === "in_probation") return emp.is_in_probation;
      if (employeeStatusFilter === "completed") return !emp.is_in_probation && !emp.probation_cleared_manually;
      if (employeeStatusFilter === "cleared_manually") return emp.probation_cleared_manually;
      if (employeeStatusFilter === "custom_allocation") return emp.has_custom_allocation;

      return true;
    });
  }, [employees, employeeSearch, employeeStatusFilter]);

  // Counts
  const inProbationCount = employees.filter((e) => e.is_in_probation).length;
  const clearedManuallyCount = employees.filter((e) => e.probation_cleared_manually).length;
  const customAllocCount = employees.filter((e) => e.has_custom_allocation).length;

  if (!isSuperAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-center space-y-3">
          <ShieldCheck className="w-12 h-12 mx-auto text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-bold">Super Admin Access Required</h2>
          <p className="text-xs">Only Super Administrators can configure and manage the company leave policy.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Top Header & Breadcrumbs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/project-management" className="hover:text-purple-600 dark:hover:text-purple-400">
              Project Management
            </Link>
            <span>/</span>
            <Link href="/project-management/addons" className="hover:text-purple-600 dark:hover:text-purple-400">
              Add-ons
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white">Leave Policy Management</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-[#56348f]" />
            <span>Leave Policy Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage dynamic monthly cycle boundaries, probation rules, automatic CL & SL allocations, 2-year carry forward, and employee overrides.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
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

      {/* ── Live Cycle KPI Cards ── */}
      {cycleInfo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Monthly Cycle Start</span>
              <Calendar className="w-4 h-4 text-[#56348f]" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {cycleInfo.start_day}<span className="text-xs font-normal text-slate-400">th of every month</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Current: <strong className="text-purple-600 dark:text-purple-400">{cycleInfo.cycle_month}</strong> ({cycleInfo.cycle_start_date} → {cycleInfo.cycle_end_date})
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Monthly Allocation Quota</span>
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              +{settings.default_monthly_cl} CL <span className="text-slate-400">/</span> +{settings.default_monthly_sl} SL
            </div>
            <div className="text-[11px] text-slate-500">
              Default quota added every cycle boundary at 12:00 AM
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Probation Period</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {settings.probation_period_months} <span className="text-xs font-normal text-slate-400">Months</span>
            </div>
            <div className="text-[11px] text-slate-500">
              {inProbationCount} employee{inProbationCount === 1 ? "" : "s"} currently in probation
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Next Auto Allocation</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {cycleInfo.next_allocation_at}
            </div>
            <div className="text-[11px] text-slate-500">
              {cycleInfo.is_cycle_start_day ? (
                <span className="text-emerald-600 font-semibold">Today is cycle start day!</span>
              ) : (
                <span>Evaluates automatically at 12:01 AM</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "general"
              ? "border-[#56348f] text-[#56348f] dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>General Policy Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("employees")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "employees"
              ? "border-[#56348f] text-[#56348f] dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employee-Wise Allocation ({employees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "ledger"
              ? "border-[#56348f] text-[#56348f] dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Ledger & History</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("simulator")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "simulator"
              ? "border-[#56348f] text-[#56348f] dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <PlayCircle className="w-4 h-4" />
          <span>Cycle Runner & Simulator</span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 1: GENERAL POLICY CONFIGURATION
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section A: Monthly Cycle & Probation */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                <Calendar className="w-4 h-4 text-[#56348f]" />
                <span>Monthly Cycle & Probation Boundary</span>
              </div>

              {/* Monthly Cycle Start Date */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Monthly Cycle Start Date (Day of Month) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={settings.monthly_cycle_start_day}
                  onChange={(e) => setSettings({ ...settings, monthly_cycle_start_day: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      Day {day} {day === 26 ? "(Default — 26th of month)" : day === 1 ? "(1st of month / Calendar month)" : `(${day}th of month)`}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Configures the start of each monthly payroll and leave cycle. For example, if configured as <strong>{settings.monthly_cycle_start_day}</strong>, the cycle runs from the {settings.monthly_cycle_start_day}th to the {settings.monthly_cycle_start_day === 1 ? 31 : settings.monthly_cycle_start_day - 1}th, with automatic allocations triggering at 12:00 AM on the {settings.monthly_cycle_start_day}th.
                </p>
              </div>

              {/* Common Probation Period */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Common Probation Period (Months) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={settings.probation_period_months}
                  onChange={(e) => setSettings({ ...settings, probation_period_months: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
                />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Default: <strong>6 months</strong>. Employees in probation do not receive normal monthly auto allocations until completing probation (becoming eligible the next day), unless an administrator manually adds leave during probation to clear it.
                </p>
              </div>
            </div>

            {/* Section B: Monthly Allocation Quotas */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Monthly Allocation Quotas</span>
              </div>

              {/* Casual Leave */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Default Monthly Casual Leave (CL) Allocation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={settings.default_monthly_cl}
                  onChange={(e) => setSettings({ ...settings, default_monthly_cl: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  Number of Casual Leaves automatically credited to eligible employees each monthly cycle.
                </p>
              </div>

              {/* Sick Leave */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Default Monthly Sick Leave (SL) Allocation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={settings.default_monthly_sl}
                  onChange={(e) => setSettings({ ...settings, default_monthly_sl: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  Number of Sick Leaves automatically credited to eligible employees each monthly cycle.
                </p>
              </div>
            </div>

            {/* Section C: Advance Notice & WFH Cutoff Rules */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Notice Period & WFH Submission Cutoffs</span>
              </div>

              {/* Casual Leave Notice Period */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Casual Leave (CL) Advance Notice Requirement (Days) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={settings.cl_advance_notice_days ?? 3}
                  onChange={(e) => setSettings({ ...settings, cl_advance_notice_days: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
                />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Default: <strong>3 days</strong>. If an employee applies for Casual Leave with fewer notice days than configured, the requested days cannot be drawn from their Casual Leave balance and are treated as Unpaid (Loss of Pay). Set to 0 to disable notice requirement.
                </p>
              </div>

              {/* WFH Cutoff Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Same-Day Full Day / Morning WFH Cutoff Time
                  </label>
                  <input
                    type="time"
                    value={settings.wfh_morning_cutoff_time || "09:45"}
                    onChange={(e) => setSettings({ ...settings, wfh_morning_cutoff_time: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 outline-none"
                  />
                  <p className="text-[10px] text-slate-400">Default: 09:45 AM (15 min buffer after 9:30 AM)</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Same-Day Afternoon Session WFH Cutoff Time
                  </label>
                  <input
                    type="time"
                    value={settings.wfh_afternoon_cutoff_time || "14:30"}
                    onChange={(e) => setSettings({ ...settings, wfh_afternoon_cutoff_time: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 outline-none"
                  />
                  <p className="text-[10px] text-slate-400">Default: 02:30 PM</p>
                </div>
              </div>

              {/* Late Time Define (Late Coming Threshold) */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    <span>Late Time Define (Late Coming Threshold)</span>
                    <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[11px] font-semibold text-[#56348f] dark:text-purple-400">
                    Default: 09:40 AM
                  </span>
                </label>
                <input
                  type="time"
                  value={settings.late_threshold_time || "09:40"}
                  onChange={(e) => setSettings({ ...settings, late_threshold_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
                />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  On working days (non-holidays, non-weekends), if an employee checks in using biometric after this time, it is considered as late coming in attendance reports and summaries. Configurable by Super Admin.
                </p>
              </div>
            </div>

            {/* Section D: Approval Workflow Rules */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                <ShieldCheck className="w-4 h-4 text-[#56348f]" />
                <span>Multi-Level Approval Workflow Rules</span>
              </div>

              {/* Single-Day Rule */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Single-Day Leave Approval Level
                </label>
                <select
                  value={settings.single_day_approval_level || "tl_only"}
                  onChange={(e) => setSettings({ ...settings, single_day_approval_level: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 outline-none"
                >
                  <option value="tl_only">Team Lead Only (Single approval needed)</option>
                  <option value="tl_and_admin">Team Lead + Super Admin (Both approvals required)</option>
                  <option value="admin_only">Super Admin Only</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Defines who must review and approve 1-day leave requests.
                </p>
              </div>

              {/* Multi-Day Threshold */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Multi-Day Admin Approval Threshold (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.multi_day_approval_threshold ?? 2}
                  onChange={(e) => setSettings({ ...settings, multi_day_approval_threshold: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  Leaves equal to or exceeding this number of days automatically require both Team Lead and Admin approval.
                </p>
              </div>

              {/* LOP Mandatory Admin */}
              <label className="flex items-center gap-2.5 pt-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.lop_admin_approval_required ?? true}
                  onChange={(e) => setSettings({ ...settings, lop_admin_approval_required: e.target.checked })}
                  className="rounded text-[#56348f] focus:ring-[#56348f]"
                />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Require Super Admin approval for any Unpaid Leave (LOP)
                </span>
              </label>
            </div>

            {/* Section E: Carry Forward & Expiration Rules */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5 lg:col-span-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Carry Forward & Expiration Invariants</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Casual Leave Card */}
                <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300">Casual Leave (CL)</span>
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                      2-Year Carry Forward
                    </span>
                  </div>
                  <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
                    Unused Casual Leave carries forward beyond the current leave year and remains valid for <strong>{settings.cl_carry_forward_years} years</strong>. Carried-forward CL older than {settings.cl_carry_forward_years} years automatically expires at the configured annual cycle boundary.
                  </p>
                </div>

                {/* Sick Leave Card */}
                <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900 dark:text-rose-300">Sick Leave (SL)</span>
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                      Annual Expiry
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                    <strong>NO multi-year carry forward</strong> for Sick Leave. All unused Sick Leaves accumulate during the year and expire at the configured annual leave-year cycle cutoff.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              style={{
                backgroundColor: "#56348f",
                color: "rgb(255, 255, 255)",
                fontFamily: '"Proxima Nova", sans-serif',
                fontSize: "13px",
                fontWeight: 600,
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {savingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin !text-white" />
                  <span className="!text-white">Saving Policy…</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 !text-white" />
                  <span className="!text-white">Save Global Leave Policy</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 2: EMPLOYEE-WISE ALLOCATIONS & OVERRIDES
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "employees" && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee or code…"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 outline-none"
              />
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setEmployeeStatusFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  employeeStatusFilter === "all"
                    ? "bg-[#56348f] text-white border-[#56348f]"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-purple-300"
                }`}
              >
                All ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setEmployeeStatusFilter("in_probation")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  employeeStatusFilter === "in_probation"
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-300"
                }`}
              >
                In Probation ({inProbationCount})
              </button>
              <button
                type="button"
                onClick={() => setEmployeeStatusFilter("cleared_manually")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  employeeStatusFilter === "cleared_manually"
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-purple-300"
                }`}
              >
                Cleared Manually ({clearedManuallyCount})
              </button>
              <button
                type="button"
                onClick={() => setEmployeeStatusFilter("custom_allocation")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  employeeStatusFilter === "custom_allocation"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
                }`}
              >
                Custom Quota ({customAllocCount})
              </button>
            </div>
          </div>

          {/* Employees Table */}
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-xs border-collapse">
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
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No employees match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
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
                              <span className="text-purple-600 dark:text-purple-400" title="Casual Leave + Carry Forward">
                                {emp.casual_leave_balance + emp.cl_carry_forward} CL
                              </span>
                              <span className="text-slate-300">/</span>
                              <span className="text-rose-600 dark:text-rose-400" title="Sick Leave">
                                {emp.sick_leave_balance} SL
                              </span>
                            </div>
                            {emp.cl_carry_forward > 0 && (
                              <div className="text-[10px] text-slate-400">
                                (incl. {emp.cl_carry_forward} CL carried forward)
                              </div>
                            )}
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
                                onClick={() => handleOpenAdjustBalance(emp)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer"
                                title="Adjust balance manually without breaking auto allocations"
                              >
                                Adjust
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditEmployee(emp)}
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
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 3: AUDIT LEDGER & TRANSACTION HISTORY
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#56348f]" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">Leave Balance Audit Ledger</span>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <select
                value={ledgerFilterType}
                onChange={(e) => setLedgerFilterType(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
              >
                <option value="">All Transaction Types</option>
                <option value="automatic_allocation">Automatic Monthly Allocation</option>
                <option value="manual_adjustment">Manual Admin Adjustment</option>
                <option value="probation_clearance">Probation Clearance</option>
                <option value="expiration">Year-End / Carry Forward Expiration</option>
              </select>

              <button
                type="button"
                onClick={() => fetchLedger(1)}
                disabled={ledgerLoading}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${ledgerLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Leave Type</th>
                    <th className="py-3.5 px-4">Transaction</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Opening → Closing</th>
                    <th className="py-3.5 px-4">Remarks / Modifier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ledgerLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#56348f]" />
                      </td>
                    </tr>
                  ) : ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No transactions recorded in the audit ledger yet.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((entry) => {
                      const isPositive = entry.amount > 0;
                      const isNegative = entry.amount < 0;

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-500 break-words whitespace-normal leading-tight">
                            {new Date(entry.created_at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {entry.user ? `${entry.user.first_name} ${entry.user.last_name}` : `User #${entry.user_id}`}
                            </div>
                            <div className="text-[11px] text-slate-400">{entry.user?.employee_code}</div>
                          </td>

                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            {entry.leave_type}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                entry.transaction_type === "automatic_allocation"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : entry.transaction_type === "manual_adjustment"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300"
                                  : entry.transaction_type === "probation_clearance"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300"
                              }`}
                            >
                              {entry.transaction_type.replace(/_/g, " ")}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-bold">
                            <span
                              className={
                                isPositive
                                  ? "text-emerald-600"
                                  : isNegative
                                  ? "text-rose-600"
                                  : "text-slate-500"
                              }
                            >
                              {isPositive ? `+${entry.amount}` : entry.amount}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {entry.opening_balance} → <strong className="text-slate-900 dark:text-white">{entry.closing_balance}</strong>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-slate-600 dark:text-slate-300 text-[11px]">{entry.remarks || "—"}</div>
                            {entry.modifier && (
                              <div className="text-[10px] text-purple-600 dark:text-purple-400">
                                By: {entry.modifier.first_name} {entry.modifier.last_name}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {ledgerTotalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-500">
                  Page {ledgerPage} of {ledgerTotalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={ledgerPage <= 1 || ledgerLoading}
                    onClick={() => fetchLedger(ledgerPage - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={ledgerPage >= ledgerTotalPages || ledgerLoading}
                    onClick={() => fetchLedger(ledgerPage + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 4: CYCLE RUNNER & SIMULATOR
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "simulator" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              <PlayCircle className="w-4 h-4 text-[#56348f]" />
              <span>Manual Policy Execution & Cycle Testing</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              The leave policy scheduler runs automatically every day at 12:01 AM. You can manually trigger or evaluate the cycle allocation below. The execution is strictly <strong>idempotent</strong>; employees who already received leave for the cycle will not receive duplicate credits unless you check the force flag.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Custom Evaluation Date (Optional)
                </label>
                <input
                  type="date"
                  value={simDate}
                  onChange={(e) => setSimDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                />
                <p className="text-[10px] text-slate-400">Leave blank to evaluate as of today</p>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simForce}
                    onChange={(e) => setSimForce(e.target.checked)}
                    className="rounded border-slate-300 text-[#56348f] focus:ring-purple-500 w-4 h-4"
                  />
                  <span>Force execute even if already allocated for this cycle</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleRunSimulator}
                disabled={runningSimulator}
                style={{
                  backgroundColor: "#56348f",
                  color: "rgb(255, 255, 255)",
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: "13px",
                  fontWeight: 600,
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {runningSimulator ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin !text-white" />
                    <span className="!text-white">Executing Policy Runner…</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4 !text-white" />
                    <span className="!text-white">Execute Cycle Allocation Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Simulation Output Card */}
          {simulationResult && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Execution Results for Cycle [{simulationResult.cycle_key}]</span>
                </h3>
                <span className="text-xs text-slate-500">{simulationResult.cycle_month}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Active</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{simulationResult.total_active_employees}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-700 dark:text-emerald-300 block text-[10px] uppercase font-bold">Allocated</span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{simulationResult.allocated_count}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="text-amber-700 dark:text-amber-300 block text-[10px] uppercase font-bold">In Probation</span>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{simulationResult.skipped_probation_count}</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                  <span className="text-purple-700 dark:text-purple-300 block text-[10px] uppercase font-bold">Already Processed</span>
                  <span className="text-lg font-bold text-purple-700 dark:text-purple-300">{simulationResult.skipped_already_allocated}</span>
                </div>
              </div>

              {simulationResult.logs && simulationResult.logs.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Detailed Action Logs:</span>
                  <div className="max-h-48 overflow-y-auto p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-1">
                    {simulationResult.logs.map((log: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL: CONFIGURE EMPLOYEE OVERRIDE
      ────────────────────────────────────────────────────────────────────────── */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Configure Leave Policy: {editingEmployee.name}
                </h3>
                <p className="text-xs text-slate-400">{editingEmployee.employee_code} • {editingEmployee.designation}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
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
                    placeholder={`Default (${settings.default_monthly_cl})`}
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
                    placeholder={`Default (${settings.default_monthly_sl})`}
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
                  placeholder={`Default (${settings.probation_period_months})`}
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
                onClick={() => setEditingEmployee(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEmployeePolicy}
                disabled={savingEmployeePolicy}
                style={{
                  backgroundColor: "#56348f",
                  color: "rgb(255, 255, 255)",
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: "12px",
                  fontWeight: 600,
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {savingEmployeePolicy ? <Loader2 className="w-3.5 h-3.5 animate-spin !text-white" /> : <Save className="w-3.5 h-3.5 !text-white" />}
                <span className="!text-white">Save Override</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL: MANUAL BALANCE ADJUSTMENT
      ────────────────────────────────────────────────────────────────────────── */}
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
    </div>
  );
}
