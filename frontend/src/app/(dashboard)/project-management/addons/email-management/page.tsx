"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Mail,
  Server,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Save,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  Users,
  Calendar,
  Home,
  Award,
  FileText,
  DollarSign,
  Info,
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  UserCheck,
  X,
  RotateCcw,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import emailSettingsApi, {
  SmtpConfig,
  RoutingRule,
  EmployeeOverride,
} from "@/services/emailSettings";
import api from "@/services/api";

type TabKey = "smtp" | "routing" | "overrides";

const ACTION_DEFINITIONS: Record<
  string,
  { label: string; description: string; icon: any; color: string }
> = {
  leave_application: {
    label: "General Leave Application",
    description: "Fired when an employee submits a standard leave request (planned in advance).",
    icon: Calendar,
    color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800",
  },
  leave_cl_short_notice: {
    label: "Casual Leave (Short Notice / Late Notice)",
    description: "Fired when an employee applies for Casual Leave with less notice than policy requirement.",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
  },
  wfh_application: {
    label: "Work From Home (WFH) Request",
    description: "Fired when an employee submits a Work From Home application.",
    icon: Home,
    color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800",
  },
  recognition_award: {
    label: "Employee Awards & Recognitions",
    description: "Fired when an employee receives an award or star of the month recognition.",
    icon: Award,
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
  },
  ta_claim: {
    label: "Travel Allowance (TA) Claim Submission",
    description: "Fired when an employee submits a new Travel Allowance reimbursement claim.",
    icon: DollarSign,
    color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800",
  },
  ta_approved: {
    label: "Travel Allowance (TA) Approval & Receipt Voucher",
    description: "Fired when an admin approves or settles a claim, sending the invoice receipt voucher and payment screenshot to the employee + CCs.",
    icon: Sparkles,
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
  },
  document_request: {
    label: "HR Document & Policy Requests",
    description: "Fired when an employee requests HR letters, salary slips, or certificates.",
    icon: FileText,
    color: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800",
  },
};

export default function EmailManagementPage() {
  const { user } = useAuthStore();
  const userRoleStr = (user?.role || "").toLowerCase();
  const isSuperAdmin = userRoleStr === "super admin";

  const [activeTab, setActiveTab] = useState<TabKey>("smtp");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // SMTP State
  const [smtp, setSmtp] = useState<SmtpConfig>({
    host: "smtp.gmail.com",
    port: 587,
    encryption: "tls",
    username: "career@intersmart.in",
    password: "",
    from_address: "career@intersmart.in",
    from_name: "Inter Smart Portal",
  });
  const [showPassword, setShowPassword] = useState(false);

  // Test Email State
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Routing State
  const [routing, setRouting] = useState<Record<string, RoutingRule>>({});
  const [newCustomTo, setNewCustomTo] = useState<Record<string, string>>({});
  const [newCustomCc, setNewCustomCc] = useState<Record<string, string>>({});

  // Employee Overrides State
  const [overrides, setOverrides] = useState<EmployeeOverride[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  // Override Drawer Modal State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [modalForm, setModalForm] = useState<{
    user_id: number;
    action: string;
    custom_to: string;
    custom_cc: string[];
    enabled: boolean;
    notes: string;
    newCcInput: string;
  }>({
    user_id: 0,
    action: "leave_application",
    custom_to: "",
    custom_cc: [],
    enabled: true,
    notes: "",
    newCcInput: "",
  });

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);

    try {
      const [settingsRes, employeesRes] = await Promise.all([
        emailSettingsApi.getSettings(),
        api.get("/employees?per_page=200"),
      ]);

      if (settingsRes.smtp) setSmtp(settingsRes.smtp);
      if (settingsRes.routing) setRouting(settingsRes.routing);
      if (settingsRes.employee_overrides) setOverrides(settingsRes.employee_overrides);

      const empList =
        employeesRes.data?.data?.data ||
        employeesRes.data?.data ||
        (Array.isArray(employeesRes.data) ? employeesRes.data : []);
      setAllEmployees(empList);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to load email configurations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Save Handlers ──
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await emailSettingsApi.updateSmtp(smtp);
      setSuccessMessage(res.message || "SMTP configuration saved successfully.");
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to save SMTP configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      setTestResult({ success: false, message: "Please enter a valid destination email address." });
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await emailSettingsApi.sendTestEmail({
        test_email: testEmail,
        host: smtp.host,
        port: smtp.port,
        encryption: smtp.encryption,
        username: smtp.username,
        password: smtp.password,
        from_address: smtp.from_address,
        from_name: smtp.from_name,
      });
      setTestResult({ success: true, message: res.message || "Test email sent successfully!" });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.response?.data?.message || err?.message || "Failed to send test email.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSaveRouting = async () => {
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await emailSettingsApi.updateRouting(routing);
      setSuccessMessage(res.message || "Global routing rules saved successfully.");
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to save routing rules.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOverrides = async (updatedOverrides: EmployeeOverride[]) => {
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await emailSettingsApi.updateEmployeeOverrides(updatedOverrides);
      setOverrides(res.data || updatedOverrides);
      setSuccessMessage(res.message || "Employee overrides saved successfully.");
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to save employee overrides.");
    } finally {
      setSaving(false);
    }
  };

  // ── Chip Helpers ──
  const handleAddGlobalTo = (actionKey: string) => {
    const val = (newCustomTo[actionKey] || "").trim();
    if (!val || !val.includes("@")) return;
    setRouting((prev) => {
      const rule = prev[actionKey] || { enabled: true };
      const current = rule.custom_to || [];
      if (current.includes(val)) return prev;
      return {
        ...prev,
        [actionKey]: { ...rule, custom_to: [...current, val] },
      };
    });
    setNewCustomTo((prev) => ({ ...prev, [actionKey]: "" }));
  };

  const handleRemoveGlobalTo = (actionKey: string, email: string) => {
    setRouting((prev) => {
      const rule = prev[actionKey];
      if (!rule) return prev;
      return {
        ...prev,
        [actionKey]: {
          ...rule,
          custom_to: (rule.custom_to || []).filter((e) => e !== email),
        },
      };
    });
  };

  const handleAddGlobalCc = (actionKey: string) => {
    const val = (newCustomCc[actionKey] || "").trim();
    if (!val || !val.includes("@")) return;
    setRouting((prev) => {
      const rule = prev[actionKey] || { enabled: true };
      const current = rule.custom_cc || [];
      if (current.includes(val)) return prev;
      return {
        ...prev,
        [actionKey]: { ...rule, custom_cc: [...current, val] },
      };
    });
    setNewCustomCc((prev) => ({ ...prev, [actionKey]: "" }));
  };

  const handleRemoveGlobalCc = (actionKey: string, email: string) => {
    setRouting((prev) => {
      const rule = prev[actionKey];
      if (!rule) return prev;
      return {
        ...prev,
        [actionKey]: {
          ...rule,
          custom_cc: (rule.custom_cc || []).filter((e) => e !== email),
        },
      };
    });
  };

  // ── Override Modal Helpers ──
  const openNewOverride = () => {
    setEditingIndex(null);
    setModalForm({
      user_id: allEmployees[0]?.id || 0,
      action: "leave_application",
      custom_to: "",
      custom_cc: [],
      enabled: true,
      notes: "",
      newCcInput: "",
    });
    setIsOverrideModalOpen(true);
  };

  const openEditOverride = (index: number) => {
    const item = overrides[index];
    if (!item) return;
    setEditingIndex(index);
    setModalForm({
      user_id: item.user_id,
      action: item.action,
      custom_to: item.custom_to || "",
      custom_cc: item.custom_cc || [],
      enabled: item.enabled ?? true,
      notes: item.notes || "",
      newCcInput: "",
    });
    setIsOverrideModalOpen(true);
  };

  const handleSaveModalOverride = () => {
    if (!modalForm.user_id) {
      alert("Please select an employee.");
      return;
    }
    const userObj = allEmployees.find((e) => e.id === Number(modalForm.user_id));
    const overrideEntry: EmployeeOverride = {
      user_id: Number(modalForm.user_id),
      user_name: userObj ? `${userObj.first_name} ${userObj.last_name || ""}`.trim() : "",
      employee_code: userObj?.employee_code || "",
      user_email: userObj?.email || "",
      action: modalForm.action,
      custom_to: modalForm.custom_to.trim() || undefined,
      custom_cc: modalForm.custom_cc,
      enabled: modalForm.enabled,
      notes: modalForm.notes.trim() || undefined,
    };

    let updated: EmployeeOverride[];
    if (editingIndex !== null) {
      updated = [...overrides];
      updated[editingIndex] = overrideEntry;
    } else {
      updated = [...overrides, overrideEntry];
    }

    setIsOverrideModalOpen(false);
    handleSaveOverrides(updated);
  };

  const handleDeleteOverride = (index: number) => {
    if (!confirm("Are you sure you want to remove this employee email override?")) return;
    const updated = overrides.filter((_, i) => i !== index);
    handleSaveOverrides(updated);
  };

  const handleRevertToNormal = (index: number) => {
    const item = overrides[index];
    const empName = item?.user_name || `Employee #${item?.user_id}`;
    if (!confirm(`Revert ${empName} back to Normal (General Routing)?\n\nThis will remove custom overrides and route notifications to the default Team Lead & Global Matrix.`)) return;
    const updated = overrides.filter((_, i) => i !== index);
    setIsOverrideModalOpen(false);
    handleSaveOverrides(updated);
  };

  const handleToggleOverrideStatus = (index: number) => {
    const updated = [...overrides];
    updated[index].enabled = !updated[index].enabled;
    handleSaveOverrides(updated);
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-center space-y-3">
          <ShieldCheck className="w-12 h-12 mx-auto text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-bold">Super Admin Access Required</h2>
          <p className="text-xs">Only Super Administrators can view and adjust email server settings and notification routing.</p>
        </div>
      </div>
    );
  }

  const filteredOverrides = overrides.filter((item) => {
    if (!employeeSearch) return true;
    const term = employeeSearch.toLowerCase();
    const name = (item.user_name || "").toLowerCase();
    const code = (item.employee_code || "").toLowerCase();
    const act = (item.action || "").toLowerCase();
    return name.includes(term) || code.includes(term) || act.includes(term);
  });

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="max-w-7xl mx-auto space-y-6 pb-12"
    >
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/project-management/addons" className="hover:text-purple-600 dark:hover:text-purple-400">
              Add-ons
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white">Email Management</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
              <Mail className="w-6 h-6" />
            </div>
            <span>Email & SMTP Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure SMTP credentials, Gmail App Passwords, global notification recipient matrix, and custom per-employee email overrides.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchData(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#56348f]" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Alert Notifications ── */}
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

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 overflow-x-auto [scrollbar-width:none]">
        <button
          onClick={() => setActiveTab("smtp")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "smtp"
              ? "bg-[#56348f] text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>SMTP & Sender Settings</span>
        </button>

        <button
          onClick={() => setActiveTab("routing")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "routing"
              ? "bg-[#56348f] text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Global Recipient & CC Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab("overrides")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "overrides"
              ? "bg-[#56348f] text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Employee-Specific Overrides</span>
          {overrides.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-bold ml-1">
              {overrides.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#56348f]" />
          <p className="text-xs font-semibold">Loading email configuration…</p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════
              TAB 1: SMTP & SENDER SETTINGS
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "smtp" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Settings Form */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-[#56348f]" />
                    <span>SMTP Mailer Credentials</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Connect your corporate Gmail or SMTP server with Google App Passwords.
                  </p>
                </div>

                <form onSubmit={handleSaveSmtp} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Sender Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Sender Email Address (Username) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={smtp.username}
                        onChange={(e) =>
                          setSmtp({
                            ...smtp,
                            username: e.target.value,
                            from_address: e.target.value,
                          })
                        }
                        placeholder="career@intersmart.in"
                        className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                      />
                    </div>

                    {/* Sender Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Sender Display Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={smtp.from_name}
                        onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })}
                        placeholder="Inter Smart Portal"
                        className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                      />
                    </div>

                    {/* Google App Password */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Google App Password / SMTP Password
                        </label>
                        <span className="text-[11px] text-slate-400">
                          (Leave blank to keep existing password)
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={smtp.password || ""}
                          onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
                          placeholder="•••• •••• •••• ••••"
                          className="w-full px-3.5 py-2 pr-10 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Host */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        SMTP Host Server <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={smtp.host}
                        onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                        placeholder="smtp.gmail.com"
                        className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                      />
                    </div>

                    {/* Port & Encryption */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Port <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          value={smtp.port}
                          onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) })}
                          placeholder="587"
                          className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Encryption <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={smtp.encryption || "tls"}
                          onChange={(e) => setSmtp({ ...smtp, encryption: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                        >
                          <option value="tls">TLS (Port 587)</option>
                          <option value="ssl">SSL (Port 465)</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Save SMTP Settings</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Send Test Email Tool Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 h-fit">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#56348f]" />
                    <span>Send Test Email</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Verify that your Gmail App Password and SMTP connection work immediately.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Destination Email Address
                    </label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="admin@intersmart.in"
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={sendingTest}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/70 dark:hover:bg-purple-900/80 text-[#56348f] dark:text-purple-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {sendingTest ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Test Email…</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Test Email</span>
                      </>
                    )}
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2 ${
                      testResult.success
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{testResult.message}</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-purple-600" />
                    <span>Gmail App Password Tip</span>
                  </div>
                  <p>
                    Enable 2-Step Verification on your Google Account, then generate a 16-character <strong>App Password</strong> under <em>Security → App Passwords</em>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 2: GLOBAL NOTIFICATION & CC MATRIX
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "routing" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Global Recipient & CC Routing Matrix
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Define default recipients, automatic role-based CCs, and custom email lists for all company trigger events.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveRouting}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Routing Rules</span>
                </button>
              </div>

              {/* Action Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(ACTION_DEFINITIONS).map(([actionKey, def]) => {
                  const rule = routing[actionKey] || {
                    notify_tl: true,
                    notify_admin: true,
                    notify_hr: true,
                    cc_applicant: true,
                    custom_to: [],
                    custom_cc: [],
                    enabled: true,
                  };
                  const IconComp = def.icon;

                  return (
                    <div
                      key={actionKey}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl border ${def.color} shrink-0`}>
                            <IconComp className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {def.label}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                              {def.description}
                            </p>
                          </div>
                        </div>

                        {/* Enable toggle */}
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={rule.enabled ?? true}
                            onChange={(e) =>
                              setRouting({
                                ...routing,
                                [actionKey]: { ...rule, enabled: e.target.checked },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#56348f]"></div>
                        </label>
                      </div>

                      {/* Default Role Toggles */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {"notify_tl" in rule && (
                          <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.notify_tl ?? true}
                              onChange={(e) =>
                                setRouting({
                                  ...routing,
                                  [actionKey]: { ...rule, notify_tl: e.target.checked },
                                })
                              }
                              className="rounded text-[#56348f] focus:ring-[#56348f]"
                            />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Notify Team Lead (TO)
                            </span>
                          </label>
                        )}

                        <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rule.notify_admin ?? true}
                            onChange={(e) =>
                              setRouting({
                                ...routing,
                                [actionKey]: { ...rule, notify_admin: e.target.checked },
                              })
                            }
                            className="rounded text-[#56348f] focus:ring-[#56348f]"
                          />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            CC Super Admin
                          </span>
                        </label>

                        <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rule.notify_hr ?? true}
                            onChange={(e) =>
                              setRouting({
                                ...routing,
                                [actionKey]: { ...rule, notify_hr: e.target.checked },
                              })
                            }
                            className="rounded text-[#56348f] focus:ring-[#56348f]"
                          />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            CC HR (hr@intersmart.in)
                          </span>
                        </label>

                        {"cc_applicant" in rule && (
                          <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.cc_applicant ?? true}
                              onChange={(e) =>
                                setRouting({
                                  ...routing,
                                  [actionKey]: { ...rule, cc_applicant: e.target.checked },
                                })
                              }
                              className="rounded text-[#56348f] focus:ring-[#56348f]"
                            />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              CC Applicant Copy
                            </span>
                          </label>
                        )}
                      </div>

                      {/* Custom TO Input Chips */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                          Additional Custom TO Addresses
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(rule.custom_to || []).map((em) => (
                            <span
                              key={em}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                            >
                              <span>{em}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveGlobalTo(actionKey, em)}
                                className="hover:text-rose-500"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={newCustomTo[actionKey] || ""}
                            onChange={(e) =>
                              setNewCustomTo({ ...newCustomTo, [actionKey]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddGlobalTo(actionKey);
                              }
                            }}
                            placeholder="Add recipient (e.g. manager@intersmart.in)"
                            className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#56348f]"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddGlobalTo(actionKey)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      {/* Custom CC Input Chips */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                          Additional Custom CC Addresses
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(rule.custom_cc || []).map((em) => (
                            <span
                              key={em}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              <span>{em}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveGlobalCc(actionKey, em)}
                                className="hover:text-rose-500"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={newCustomCc[actionKey] || ""}
                            onChange={(e) =>
                              setNewCustomCc({ ...newCustomCc, [actionKey]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddGlobalCc(actionKey);
                              }
                            }}
                            placeholder="Add CC email (e.g. all@intersmart.in)"
                            className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#56348f]"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddGlobalCc(actionKey)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 3: EMPLOYEE-SPECIFIC OVERRIDES
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "overrides" && (
            <div className="space-y-6">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Per-Employee Email Overrides
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Override default Team Lead and CC routing for specific employees without altering other team members.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openNewOverride}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all hover:scale-[1.02] cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Employee Override</span>
                </button>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search override by employee name, code, or action…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                />
              </div>

              {/* Overrides Table / Cards */}
              {filteredOverrides.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                  <UserCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    No custom employee email overrides
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    All employees are currently using standard team lead and global CC routing. Click Add Employee Override to create a custom rule for an individual.
                  </p>
                  <button
                    onClick={openNewOverride}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#56348f] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Override</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredOverrides.map((item, idx) => {
                    const actDef = ACTION_DEFINITIONS[item.action] || {
                      label: item.action,
                      icon: Send,
                      color: "text-purple-600 bg-purple-50",
                    };
                    const ActIcon = actDef.icon;

                    return (
                      <div
                        key={idx}
                        className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm space-y-3 ${
                          item.enabled
                            ? "border-purple-200/80 dark:border-purple-800/60"
                            : "border-slate-200 dark:border-slate-800 opacity-60"
                        }`}
                      >
                        {/* Employee & Status */}
                        <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                {item.user_name || `Employee #${item.user_id}`}
                              </h3>
                              {item.employee_code && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {item.employee_code}
                                </span>
                              )}
                            </div>
                            {item.user_email && (
                              <p className="text-[11px] text-slate-400 mt-0.5">{item.user_email}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleOverrideStatus(idx)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer border ${
                                item.enabled
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {item.enabled ? "Active" : "Disabled"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevertToNormal(idx)}
                              title="Revert to Normal (General Routing)"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[11px] font-semibold border border-amber-200/60 dark:border-amber-800/60 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Revert to Normal</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditOverride(idx)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                              title="Edit override"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOverride(idx)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 cursor-pointer"
                              title="Delete override"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Action / Trigger Tag */}
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <ActIcon className="w-3.5 h-3.5 text-[#56348f] dark:text-purple-400" />
                          <span>Trigger: {actDef.label}</span>
                        </div>

                        {/* Custom TO & CC Breakdown */}
                        <div className="space-y-2 text-xs">
                          {item.custom_to && (
                            <div className="flex items-start gap-2">
                              <strong className="text-slate-400 w-16 shrink-0">Custom TO:</strong>
                              <span className="font-semibold text-purple-700 dark:text-purple-300 font-mono">
                                {item.custom_to}
                              </span>
                            </div>
                          )}

                          {item.custom_cc && item.custom_cc.length > 0 && (
                            <div className="flex items-start gap-2">
                              <strong className="text-slate-400 w-16 shrink-0">Custom CC:</strong>
                              <div className="flex flex-wrap gap-1">
                                {item.custom_cc.map((cc) => (
                                  <span
                                    key={cc}
                                    className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
                                  >
                                    {cc}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.notes && (
                            <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Override Side Drawer (Matching Birthday Wish Drawer) ── */}
      {isOverrideModalOpen && (
        <div
          style={{
            fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
          className="fixed inset-0 z-50 overflow-hidden font-sans"
        >
          {/* Backdrop */}
          <div
            onClick={() => setIsOverrideModalOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Sliding Right Drawer */}
          <div className="fixed inset-y-0 right-0 max-w-lg w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-50 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-purple-50/80 to-white dark:from-slate-850 dark:to-slate-900 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#56348f]" />
                  <span>{editingIndex !== null ? "Edit Employee Override" : "New Employee Email Override"}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Route notifications for this employee to a specific manager or coordinator.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Employee Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modalForm.user_id}
                  onChange={(e) => setModalForm({ ...modalForm, user_id: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                >
                  <option value={0}>Choose an employee…</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code || `ID ${emp.id}`}) — {emp.team?.name || emp.designation || "Unassigned"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action / Trigger Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Trigger Event / Action <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modalForm.action}
                  onChange={(e) => setModalForm({ ...modalForm, action: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                >
                  {Object.entries(ACTION_DEFINITIONS).map(([actKey, actDef]) => (
                    <option key={actKey} value={actKey}>
                      {actDef.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom TO Recipient */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Custom TO Recipient Email (Overrides Team Lead)
                  </label>
                </div>
                <input
                  type="email"
                  value={modalForm.custom_to}
                  onChange={(e) => setModalForm({ ...modalForm, custom_to: e.target.value })}
                  placeholder="supervisor@intersmart.in"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                />
              </div>

              {/* Custom CC List Chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Custom CC Emails (Dedicated for this employee)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {modalForm.custom_cc.map((ccEmail) => (
                    <span
                      key={ccEmail}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      <span>{ccEmail}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setModalForm({
                            ...modalForm,
                            custom_cc: modalForm.custom_cc.filter((e) => e !== ccEmail),
                          })
                        }
                        className="hover:text-rose-500 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={modalForm.newCcInput}
                    onChange={(e) => setModalForm({ ...modalForm, newCcInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = modalForm.newCcInput.trim();
                        if (val && val.includes("@") && !modalForm.custom_cc.includes(val)) {
                          setModalForm({
                            ...modalForm,
                            custom_cc: [...modalForm.custom_cc, val],
                            newCcInput: "",
                          });
                        }
                      }
                    }}
                    placeholder="coordinator@intersmart.in"
                    className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#56348f]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = modalForm.newCcInput.trim();
                      if (val && val.includes("@") && !modalForm.custom_cc.includes(val)) {
                        setModalForm({
                          ...modalForm,
                          custom_cc: [...modalForm.custom_cc, val],
                          newCcInput: "",
                        });
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    + Add CC
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notes / Internal Reason
                </label>
                <input
                  type="text"
                  value={modalForm.notes}
                  onChange={(e) => setModalForm({ ...modalForm, notes: e.target.value })}
                  placeholder="Direct report to Project Manager"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                />
              </div>

              {/* Active Toggle */}
              <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalForm.enabled}
                  onChange={(e) => setModalForm({ ...modalForm, enabled: e.target.checked })}
                  className="rounded text-[#56348f] focus:ring-[#56348f]"
                />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Enable this override immediately
                </span>
              </label>
            </div>

            {/* Fixed Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-2 flex-wrap">
              {editingIndex !== null ? (
                <button
                  type="button"
                  onClick={() => handleRevertToNormal(editingIndex)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 transition-colors cursor-pointer"
                  title="Remove this override and restore general global routing"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert to Normal (General)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setModalForm({
                      ...modalForm,
                      custom_to: "",
                      custom_cc: [],
                      notes: "",
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Default</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalOverride}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Override</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
