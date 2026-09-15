"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  ShieldCheck,
  Building2,
  UserCheck,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Home,
  Calendar,
  Layers,
  Info,
  Check,
  X,
  Search,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import emailSettingsApi, {
  ApprovalRoutingRules,
  ApprovalRoutingResponse,
  DepartmentApprovalRule,
  EmployeeApprovalRule,
  RoleApprovalRule,
} from "@/services/emailSettings";

export default function ApprovalRoutingTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [rules, setRules] = useState<ApprovalRoutingRules>({
    role_rules: {
      team_lead: {
        wfh: {
          to_user_id: null,
          to_email: null,
          cc_user_ids: [],
          cc_emails: ["hr@intersmart.in", "admin@intersmart.in"],
          approval_level: "multi",
          enabled: true,
        },
        leave_single_day: {
          to_user_id: null,
          to_email: null,
          cc_user_ids: [],
          cc_emails: ["hr@intersmart.in", "admin@intersmart.in"],
          approval_level: "single",
          enabled: true,
        },
        leave_multi_day: {
          to_user_id: null,
          to_email: null,
          cc_user_ids: [],
          cc_emails: ["hr@intersmart.in", "admin@intersmart.in"],
          approval_level: "multi",
          enabled: true,
        },
      },
    },
    department_rules: [],
    employee_rules: [],
  });

  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Sub-tabs: 'role' | 'department' | 'employee'
  const [subTab, setSubTab] = useState<"role" | "department" | "employee">("role");

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState<DepartmentApprovalRule>({
    id: "",
    team_id: 0,
    request_type: "all",
    to_user_id: null,
    to_email: null,
    cc_user_ids: [],
    cc_emails: [],
    approval_level: "multi",
    enabled: true,
  });

  // Employee Modal State
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [empForm, setEmpForm] = useState<EmployeeApprovalRule>({
    id: "",
    user_id: 0,
    request_type: "all",
    to_user_id: null,
    to_email: null,
    cc_user_ids: [],
    cc_emails: [],
    approval_level: "multi",
    enabled: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data: ApprovalRoutingResponse = await emailSettingsApi.getApprovalRouting();
      if (data.rules) {
        setRules(data.rules);
      }
      if (data.teams) {
        setTeams(data.teams);
      }
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to load approval routing rules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await emailSettingsApi.updateApprovalRouting(rules);
      setSuccessMessage(res.message || "Approval routing rules saved successfully.");
      if (res.data) {
        setRules(res.data);
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to save approval routing rules.");
    } finally {
      setSaving(false);
    }
  };

  // ── Team Lead Rule Updaters ──
  const updateTlRule = (
    key: "wfh" | "leave_single_day" | "leave_multi_day",
    field: keyof RoleApprovalRule,
    value: any
  ) => {
    setRules((prev) => {
      const tl = prev.role_rules?.team_lead || ({} as any);
      const current = tl[key] || {
        to_user_id: null,
        to_email: null,
        cc_user_ids: [],
        cc_emails: [],
        approval_level: "multi",
        enabled: true,
      };

      return {
        ...prev,
        role_rules: {
          ...prev.role_rules,
          team_lead: {
            ...tl,
            [key]: {
              ...current,
              [field]: value,
            },
          },
        },
      };
    });
  };

  const handleToAccountChange = (
    key: "wfh" | "leave_single_day" | "leave_multi_day",
    userId: number | null
  ) => {
    const selectedUser = users.find((u) => u.id === userId);
    setRules((prev) => {
      const tl = prev.role_rules?.team_lead || ({} as any);
      const current = tl[key] || {
        to_user_id: null,
        to_email: null,
        cc_user_ids: [],
        cc_emails: [],
        approval_level: "multi",
        enabled: true,
      };

      return {
        ...prev,
        role_rules: {
          ...prev.role_rules,
          team_lead: {
            ...tl,
            [key]: {
              ...current,
              to_user_id: userId,
              to_email: selectedUser?.email || null,
            },
          },
        },
      };
    });
  };

  const toggleCcUser = (
    key: "wfh" | "leave_single_day" | "leave_multi_day",
    userId: number
  ) => {
    const selectedUser = users.find((u) => u.id === userId);
    setRules((prev) => {
      const tl = prev.role_rules?.team_lead || ({} as any);
      const current = tl[key] || {
        to_user_id: null,
        to_email: null,
        cc_user_ids: [],
        cc_emails: [],
        approval_level: "multi",
        enabled: true,
      };

      const existingIds = current.cc_user_ids || [];
      const existingEmails = current.cc_emails || [];
      const isSelected = existingIds.includes(userId);

      const newIds = isSelected
        ? existingIds.filter((id: number) => id !== userId)
        : [...existingIds, userId];

      const newEmails = isSelected
        ? existingEmails.filter((em: string) => em !== selectedUser?.email)
        : selectedUser?.email
        ? [...existingEmails, selectedUser.email]
        : existingEmails;

      return {
        ...prev,
        role_rules: {
          ...prev.role_rules,
          team_lead: {
            ...tl,
            [key]: {
              ...current,
              cc_user_ids: newIds,
              cc_emails: Array.from(new Set(newEmails)),
            },
          },
        },
      };
    });
  };

  // ── Department Rules ──
  const openNewDeptRule = () => {
    setDeptForm({
      id: "dept_" + Date.now(),
      team_id: teams[0]?.id || 0,
      request_type: "all",
      to_user_id: null,
      to_email: null,
      cc_user_ids: [],
      cc_emails: [],
      approval_level: "multi",
      enabled: true,
    });
    setIsDeptModalOpen(true);
  };

  const saveDeptModal = () => {
    if (!deptForm.team_id) return;
    setRules((prev) => {
      const existingIndex = prev.department_rules.findIndex((r) => r.id === deptForm.id);
      let updated: DepartmentApprovalRule[];
      if (existingIndex >= 0) {
        updated = [...prev.department_rules];
        updated[existingIndex] = deptForm;
      } else {
        updated = [...prev.department_rules, deptForm];
      }
      return { ...prev, department_rules: updated };
    });
    setIsDeptModalOpen(false);
  };

  const deleteDeptRule = (id: string) => {
    setRules((prev) => ({
      ...prev,
      department_rules: prev.department_rules.filter((r) => r.id !== id),
    }));
  };

  // ── Employee Rules ──
  const openNewEmpRule = () => {
    setEmpForm({
      id: "emp_" + Date.now(),
      user_id: users[0]?.id || 0,
      request_type: "all",
      to_user_id: null,
      to_email: null,
      cc_user_ids: [],
      cc_emails: [],
      approval_level: "multi",
      enabled: true,
    });
    setIsEmpModalOpen(true);
  };

  const saveEmpModal = () => {
    if (!empForm.user_id) return;
    setRules((prev) => {
      const existingIndex = prev.employee_rules.findIndex((r) => r.id === empForm.id);
      let updated: EmployeeApprovalRule[];
      if (existingIndex >= 0) {
        updated = [...prev.employee_rules];
        updated[existingIndex] = empForm;
      } else {
        updated = [...prev.employee_rules, empForm];
      }
      return { ...prev, employee_rules: updated };
    });
    setIsEmpModalOpen(false);
  };

  const deleteEmpRule = (id: string) => {
    setRules((prev) => ({
      ...prev,
      employee_rules: prev.employee_rules.filter((r) => r.id !== id),
    }));
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#56348f] animate-spin" />
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Loading approval routing configurations…
        </span>
      </div>
    );
  }

  const tlRules = rules.role_rules?.team_lead || ({} as any);

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-700 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="font-semibold">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-700 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Global Fallback Notice for General Employees */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/60 flex items-start gap-3 shadow-sm">
        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
            Default Invariant: General Employees (No Team Assigned)
          </h4>
          <p className="text-xs text-blue-700/90 dark:text-blue-300/80 leading-relaxed">
            Employees who are not assigned to any team automatically route all Work From Home (WFH) and Leave applications directly to <strong>Super Admin</strong> for direct single-level approval. No manual configuration is required for unassigned staff.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Save Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => setSubTab("role")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === "role"
                ? "bg-white dark:bg-slate-900 text-[#56348f] dark:text-purple-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Role-Wise (Team Leads)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("department")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === "department"
                ? "bg-white dark:bg-slate-900 text-[#56348f] dark:text-purple-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Department / Team-Wise</span>
            {rules.department_rules?.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-[#56348f] dark:bg-purple-900/60 dark:text-purple-300">
                {rules.department_rules.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubTab("employee")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === "employee"
                ? "bg-white dark:bg-slate-900 text-[#56348f] dark:text-purple-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Employee-Wise Overrides</span>
            {rules.employee_rules?.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-[#56348f] dark:bg-purple-900/60 dark:text-purple-300">
                {rules.employee_rules.length}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Changes</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SUB-TAB 1: ROLE-WISE RULES (TEAM LEADS)
      ══════════════════════════════════════════════════════════════ */}
      {subTab === "role" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#56348f]" />
              <span>Team Lead Requests Routing & Multi-Level Approvals</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Define the designated primary <strong>TO Account</strong> (Manager/Director who approves first) and <strong>CC Accounts</strong> whenever a Team Lead submits a request. You can also toggle between <strong>Single-Level</strong> and <strong>Multi-Level Approval</strong> (where both the TO Account and Super Admin must approve).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. WFH Request */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">WFH Request</h4>
                    <span className="text-[11px] text-slate-400">Team Lead remote work</span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tlRules.wfh?.enabled ?? true}
                    onChange={(e) => updateTlRule("wfh", "enabled", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#56348f]"></div>
                </label>
              </div>

              {/* Approval Level Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Approval Level</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    tlRules.wfh?.approval_level === "multi"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {tlRules.wfh?.approval_level === "multi" ? "Multi-Level (TO + Admin)" : "Single-Level"}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => updateTlRule("wfh", "approval_level", "multi")}
                    className={`py-1.5 px-2 rounded-xl font-semibold border text-center transition-all ${
                      tlRules.wfh?.approval_level === "multi"
                        ? "bg-purple-50 text-[#56348f] border-purple-300 dark:bg-purple-950/40 dark:border-purple-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                    }`}
                  >
                    Multi-Level
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTlRule("wfh", "approval_level", "single")}
                    className={`py-1.5 px-2 rounded-xl font-semibold border text-center transition-all ${
                      tlRules.wfh?.approval_level === "single"
                        ? "bg-purple-50 text-[#56348f] border-purple-300 dark:bg-purple-950/40 dark:border-purple-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                    }`}
                  >
                    Single-Level
                  </button>
                </div>
              </div>

              {/* TO Account Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Primary TO Account (Approver)
                </label>
                <select
                  value={tlRules.wfh?.to_user_id || 0}
                  onChange={(e) => handleToAccountChange("wfh", Number(e.target.value) || null)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#56348f]"
                >
                  <option value={0}>-- Direct to Super Admin (admin@intersmart.in) --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.employee_code || `ID ${u.id}`}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* CC Account Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  CC Accounts ({tlRules.wfh?.cc_user_ids?.length || 0} selected)
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  {users.slice(0, 40).map((u) => {
                    const isChecked = (tlRules.wfh?.cc_user_ids || []).includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 p-1 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCcUser("wfh", u.id)}
                          className="rounded text-[#56348f] focus:ring-[#56348f]"
                        />
                        <span className="truncate">{u.first_name} {u.last_name} ({u.email})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. Casual / Sick Leave (1 Day Only) */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">1-Day Leave</h4>
                    <span className="text-[11px] text-slate-400">Casual / Sick (1 day only)</span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tlRules.leave_single_day?.enabled ?? true}
                    onChange={(e) => updateTlRule("leave_single_day", "enabled", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#56348f]"></div>
                </label>
              </div>

              {/* Approval Level Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Approval Level</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    tlRules.leave_single_day?.approval_level === "single"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
                  }`}>
                    {tlRules.leave_single_day?.approval_level === "single" ? "Single-Level (Default)" : "Multi-Level"}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => updateTlRule("leave_single_day", "approval_level", "single")}
                    className={`py-1.5 px-2 rounded-xl font-semibold border text-center transition-all ${
                      tlRules.leave_single_day?.approval_level === "single"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                    }`}
                  >
                    Single-Level
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTlRule("leave_single_day", "approval_level", "multi")}
                    className={`py-1.5 px-2 rounded-xl font-semibold border text-center transition-all ${
                      tlRules.leave_single_day?.approval_level === "multi"
                        ? "bg-purple-50 text-[#56348f] border-purple-300 dark:bg-purple-950/40 dark:border-purple-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                    }`}
                  >
                    Multi-Level
                  </button>
                </div>
              </div>

              {/* TO Account Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Primary TO Account (Approver)
                </label>
                <select
                  value={tlRules.leave_single_day?.to_user_id || 0}
                  onChange={(e) => handleToAccountChange("leave_single_day", Number(e.target.value) || null)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#56348f]"
                >
                  <option value={0}>-- Direct to Super Admin (admin@intersmart.in) --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.employee_code || `ID ${u.id}`}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* CC Account Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  CC Accounts ({tlRules.leave_single_day?.cc_user_ids?.length || 0} selected)
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  {users.slice(0, 40).map((u) => {
                    const isChecked = (tlRules.leave_single_day?.cc_user_ids || []).includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 p-1 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCcUser("leave_single_day", u.id)}
                          className="rounded text-[#56348f] focus:ring-[#56348f]"
                        />
                        <span className="truncate">{u.first_name} {u.last_name} ({u.email})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Casual / Sick Leave (Multiple Days) */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Multi-Day Leave</h4>
                    <span className="text-[11px] text-slate-400">Casual / Sick (&gt; 1 day)</span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tlRules.leave_multi_day?.enabled ?? true}
                    onChange={(e) => updateTlRule("leave_multi_day", "enabled", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#56348f]"></div>
                </label>
              </div>

              {/* Approval Level Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Approval Level</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    tlRules.leave_multi_day?.approval_level === "multi"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {tlRules.leave_multi_day?.approval_level === "multi" ? "Multi-Level (Default)" : "Single-Level"}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => updateTlRule("leave_multi_day", "approval_level", "multi")}
                    className={`py-1.5 px-2 rounded-xl font-semibold border text-center transition-all ${
                      tlRules.leave_multi_day?.approval_level === "multi"
                        ? "bg-purple-50 text-[#56348f] border-purple-300 dark:bg-purple-950/40 dark:border-purple-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                    }`}
                  >
                    Multi-Level
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTlRule("leave_multi_day", "approval_level", "single")}
                    className={`py-1.5 px-2 rounded-xl font-semibold border text-center transition-all ${
                      tlRules.leave_multi_day?.approval_level === "single"
                        ? "bg-purple-50 text-[#56348f] border-purple-300 dark:bg-purple-950/40 dark:border-purple-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                    }`}
                  >
                    Single-Level
                  </button>
                </div>
              </div>

              {/* TO Account Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Primary TO Account (Approver)
                </label>
                <select
                  value={tlRules.leave_multi_day?.to_user_id || 0}
                  onChange={(e) => handleToAccountChange("leave_multi_day", Number(e.target.value) || null)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#56348f]"
                >
                  <option value={0}>-- Direct to Super Admin (admin@intersmart.in) --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.employee_code || `ID ${u.id}`}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* CC Account Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  CC Accounts ({tlRules.leave_multi_day?.cc_user_ids?.length || 0} selected)
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  {users.slice(0, 40).map((u) => {
                    const isChecked = (tlRules.leave_multi_day?.cc_user_ids || []).includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 p-1 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCcUser("leave_multi_day", u.id)}
                          className="rounded text-[#56348f] focus:ring-[#56348f]"
                        />
                        <span className="truncate">{u.first_name} {u.last_name} ({u.email})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SUB-TAB 2: DEPARTMENT / TEAM-WISE RULES
      ══════════════════════════════════════════════════════════════ */}
      {subTab === "department" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#56348f]" />
                <span>Department / Team-Wise Approval Routing</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Route requests from entire departments to dedicated managers or department heads with single or multi-level approvals.
              </p>
            </div>

            <button
              type="button"
              onClick={openNewDeptRule}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department Rule</span>
            </button>
          </div>

          {rules.department_rules?.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Department Routing Rules Configured</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Departments without specific custom rules follow the standard Team Lead approval chain and role-level rules.
              </p>
              <button
                onClick={openNewDeptRule}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#56348f] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Rule</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.department_rules.map((rule) => {
                const team = teams.find((t) => t.id === rule.team_id);
                const toUser = users.find((u) => u.id === rule.to_user_id);
                return (
                  <div
                    key={rule.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{team?.name || `Team ID ${rule.team_id}`}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {rule.request_type.toUpperCase()}
                          </span>
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">{team?.code || ""}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDeptForm(rule);
                            setIsDeptModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteDeptRule(rule.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Approval Level:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {rule.approval_level === "multi" ? "Multi-Level (TO + Admin)" : "Single-Level"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">TO Account:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                          {toUser ? `${toUser.first_name} ${toUser.last_name}` : rule.to_email || "Direct Admin"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">CC Accounts:</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {rule.cc_user_ids?.length || 0} user(s) selected
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SUB-TAB 3: EMPLOYEE-WISE RULES
      ══════════════════════════════════════════════════════════════ */}
      {subTab === "employee" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#56348f]" />
                <span>Employee-Specific Approval & Email Overrides</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set individual overrides for specific employees to redirect their approvals and notification emails.
              </p>
            </div>

            <button
              type="button"
              onClick={openNewEmpRule}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee Rule</span>
            </button>
          </div>

          {rules.employee_rules?.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <UserCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Employee Overrides Configured</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All employees are currently using their default team lead and role-level approval routing.
              </p>
              <button
                onClick={openNewEmpRule}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#56348f] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Override</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.employee_rules.map((rule) => {
                const targetEmp = users.find((u) => u.id === rule.user_id);
                const toUser = users.find((u) => u.id === rule.to_user_id);
                return (
                  <div
                    key={rule.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{targetEmp ? `${targetEmp.first_name} ${targetEmp.last_name}` : `User ID ${rule.user_id}`}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#56348f] dark:bg-purple-950 dark:text-purple-300">
                            {rule.request_type.toUpperCase()}
                          </span>
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">{targetEmp?.email || ""}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEmpForm(rule);
                            setIsEmpModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEmpRule(rule.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Approval Level:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {rule.approval_level === "multi" ? "Multi-Level (TO + Admin)" : "Single-Level"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">TO Account:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                          {toUser ? `${toUser.first_name} ${toUser.last_name}` : rule.to_email || "Direct Admin"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">CC Accounts:</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {rule.cc_user_ids?.length || 0} user(s) selected
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Department Rule Modal ── */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#56348f]" />
                <span>Configure Department Rule</span>
              </h3>
              <button onClick={() => setIsDeptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Department / Team</label>
                <select
                  value={deptForm.team_id}
                  onChange={(e) => setDeptForm({ ...deptForm, team_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Request Type</label>
                <select
                  value={deptForm.request_type}
                  onChange={(e) => setDeptForm({ ...deptForm, request_type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="all">All Requests (WFH & Leaves)</option>
                  <option value="wfh">Work From Home (WFH) Only</option>
                  <option value="leave">Leaves Only</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Approval Level</label>
                <select
                  value={deptForm.approval_level}
                  onChange={(e) => setDeptForm({ ...deptForm, approval_level: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="multi">Multi-Level (Assigned TO Approver + Super Admin)</option>
                  <option value="single">Single-Level (Assigned TO Approver Only)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Assigned TO Account (Approver)</label>
                <select
                  value={deptForm.to_user_id || 0}
                  onChange={(e) => {
                    const uId = Number(e.target.value) || null;
                    const u = users.find((usr) => usr.id === uId);
                    setDeptForm({ ...deptForm, to_user_id: uId, to_email: u?.email || null });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value={0}>-- Direct to Super Admin --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDeptModal}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#56348f] text-white hover:bg-[#462875]"
              >
                Apply Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Employee Rule Modal ── */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#56348f]" />
                <span>Configure Employee Override</span>
              </h3>
              <button onClick={() => setIsEmpModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Select Employee</label>
                <select
                  value={empForm.user_id}
                  onChange={(e) => setEmpForm({ ...empForm, user_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.employee_code || `ID ${u.id}`}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Request Type</label>
                <select
                  value={empForm.request_type}
                  onChange={(e) => setEmpForm({ ...empForm, request_type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="all">All Requests (WFH & Leaves)</option>
                  <option value="wfh">Work From Home (WFH) Only</option>
                  <option value="leave">Leaves Only</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Approval Level</label>
                <select
                  value={empForm.approval_level}
                  onChange={(e) => setEmpForm({ ...empForm, approval_level: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="multi">Multi-Level (Assigned TO Approver + Super Admin)</option>
                  <option value="single">Single-Level (Assigned TO Approver Only)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Assigned TO Account (Approver)</label>
                <select
                  value={empForm.to_user_id || 0}
                  onChange={(e) => {
                    const uId = Number(e.target.value) || null;
                    const u = users.find((usr) => usr.id === uId);
                    setEmpForm({ ...empForm, to_user_id: uId, to_email: u?.email || null });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value={0}>-- Direct to Super Admin --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEmpModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEmpModal}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#56348f] text-white hover:bg-[#462875]"
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
