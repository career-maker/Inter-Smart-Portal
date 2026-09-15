"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  ShieldCheck,
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
  X,
  Search,
  Check,
  UserCheck2,
  UserPlus,
} from "lucide-react";
import emailSettingsApi, {
  ApprovalRoutingRules,
  ApprovalRoutingResponse,
  RoleApprovalRule,
  TeamLeadApprovalRuleGroup,
  EmployeeApprovalRuleGroup,
} from "@/services/emailSettings";
import { Portal } from "@/components/ui/portal";

const createDefaultThreeCards = (): {
  wfh: RoleApprovalRule;
  leave_single_day: RoleApprovalRule;
  leave_multi_day: RoleApprovalRule;
} => ({
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
});

interface ThreeCardsEditorProps {
  wfh: RoleApprovalRule;
  leaveSingle: RoleApprovalRule;
  leaveMulti: RoleApprovalRule;
  users: any[];
  onChangeWfh: (field: keyof RoleApprovalRule, val: any) => void;
  onChangeLeaveSingle: (field: keyof RoleApprovalRule, val: any) => void;
  onChangeLeaveMulti: (field: keyof RoleApprovalRule, val: any) => void;
}

function ThreeCardsEditor({
  wfh,
  leaveSingle,
  leaveMulti,
  users,
  onChangeWfh,
  onChangeLeaveSingle,
  onChangeLeaveMulti,
}: ThreeCardsEditorProps) {
  const [ccSearchWfh, setCcSearchWfh] = useState("");
  const [ccSearchSingle, setCcSearchSingle] = useState("");
  const [ccSearchMulti, setCcSearchMulti] = useState("");

  const handleToAccount = (
    setter: (field: keyof RoleApprovalRule, val: any) => void,
    userId: number | null
  ) => {
    setter("to_user_id", userId);
    const u = users.find((usr) => usr.id === userId);
    setter("to_email", u?.email || null);
  };

  const toggleCc = (
    currentRule: RoleApprovalRule,
    setter: (field: keyof RoleApprovalRule, val: any) => void,
    userId: number
  ) => {
    const u = users.find((usr) => usr.id === userId);
    const existingIds = currentRule.cc_user_ids || [];
    const existingEmails = currentRule.cc_emails || [];
    const isSelected = existingIds.includes(userId);

    const newIds = isSelected
      ? existingIds.filter((id) => id !== userId)
      : [...existingIds, userId];

    const newEmails = isSelected
      ? existingEmails.filter((em) => em !== u?.email)
      : u?.email
      ? [...existingEmails, u.email]
      : existingEmails;

    setter("cc_user_ids", newIds);
    setter("cc_emails", Array.from(new Set(newEmails)));
  };

  const filterUsers = (query: string) => {
    if (!query.trim()) return users;
    const q = query.toLowerCase();
    return users.filter(
      (u) =>
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.employee_code?.toLowerCase().includes(q)
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* ── CARD 1: WFH Request ── */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">WFH Request</h4>
              <span className="text-[11px] text-slate-400">Work from home remote routing</span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={wfh.enabled ?? true}
              onChange={(e) => onChangeWfh("enabled", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#56348f]"></div>
          </label>
        </div>

        {/* Approval Level Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Approval Level</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                wfh.approval_level === "multi"
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {wfh.approval_level === "multi" ? "Multi-Level (Approver + Admin)" : "Single-Level"}
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => onChangeWfh("approval_level", "multi")}
              className={`py-1.5 px-2 rounded-xl font-semibold border text-center transition-all ${
                wfh.approval_level === "multi"
                  ? "bg-purple-50 text-[#56348f] border-purple-300 dark:bg-purple-950/40 dark:border-purple-800"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
              }`}
            >
              Multi-Level
            </button>
            <button
              type="button"
              onClick={() => onChangeWfh("approval_level", "single")}
              className={`py-1.5 px-2 rounded-xl font-semibold border text-center transition-all ${
                wfh.approval_level === "single"
                  ? "bg-purple-50 text-[#56348f] border-purple-300 dark:bg-purple-950/40 dark:border-purple-800"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
              }`}
            >
              Single-Level
            </button>
          </div>
        </div>

        {/* Primary TO Account */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Primary TO Account (Approver)
          </label>
          <select
            value={wfh.to_user_id || 0}
            onChange={(e) => handleToAccount(onChangeWfh, Number(e.target.value) || null)}
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

        {/* CC Accounts */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              CC Accounts ({wfh.cc_user_ids?.length || 0})
            </label>
            {wfh.cc_user_ids?.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onChangeWfh("cc_user_ids", []);
                  onChangeWfh("cc_emails", []);
                }}
                className="text-[10px] text-rose-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search user to CC..."
              value={ccSearchWfh}
              onChange={(e) => setCcSearchWfh(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#56348f]"
            />
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            {filterUsers(ccSearchWfh).slice(0, 50).map((u) => {
              const isChecked = (wfh.cc_user_ids || []).includes(u.id);
              return (
                <label
                  key={u.id}
                  className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 p-1 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCc(wfh, onChangeWfh, u.id)}
                    className="rounded text-[#56348f] focus:ring-[#56348f]"
                  />
                  <span className="truncate">
                    {u.first_name} {u.last_name} ({u.email})
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CARD 2: Casual / Sick Leave (1 Day Only) ── */}
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
              checked={leaveSingle.enabled ?? true}
              onChange={(e) => onChangeLeaveSingle("enabled", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#56348f]"></div>
          </label>
        </div>

        {/* Approval Level Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Approval Level</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                leaveSingle.approval_level === "single"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
              }`}
            >
              {leaveSingle.approval_level === "single" ? "Single-Level" : "Multi-Level"}
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => onChangeLeaveSingle("approval_level", "single")}
              className={`py-1.5 px-2 rounded-xl font-semibold border text-center transition-all ${
                leaveSingle.approval_level === "single"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
              }`}
            >
              Single-Level
            </button>
            <button
              type="button"
              onClick={() => onChangeLeaveSingle("approval_level", "multi")}
              className={`py-1.5 px-2 rounded-xl font-semibold border text-center transition-all ${
                leaveSingle.approval_level === "multi"
                  ? "bg-purple-50 text-[#56348f] border-purple-300 dark:bg-purple-950/40 dark:border-purple-800"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
              }`}
            >
              Multi-Level
            </button>
          </div>
        </div>

        {/* Primary TO Account */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Primary TO Account (Approver)
          </label>
          <select
            value={leaveSingle.to_user_id || 0}
            onChange={(e) => handleToAccount(onChangeLeaveSingle, Number(e.target.value) || null)}
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

        {/* CC Accounts */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              CC Accounts ({leaveSingle.cc_user_ids?.length || 0})
            </label>
            {leaveSingle.cc_user_ids?.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onChangeLeaveSingle("cc_user_ids", []);
                  onChangeLeaveSingle("cc_emails", []);
                }}
                className="text-[10px] text-rose-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search user to CC..."
              value={ccSearchSingle}
              onChange={(e) => setCcSearchSingle(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#56348f]"
            />
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            {filterUsers(ccSearchSingle).slice(0, 50).map((u) => {
              const isChecked = (leaveSingle.cc_user_ids || []).includes(u.id);
              return (
                <label
                  key={u.id}
                  className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 p-1 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCc(leaveSingle, onChangeLeaveSingle, u.id)}
                    className="rounded text-[#56348f] focus:ring-[#56348f]"
                  />
                  <span className="truncate">
                    {u.first_name} {u.last_name} ({u.email})
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CARD 3: Multi-Day Leave (> 1 Day) ── */}
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
              checked={leaveMulti.enabled ?? true}
              onChange={(e) => onChangeLeaveMulti("enabled", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#56348f]"></div>
          </label>
        </div>

        {/* Approval Level Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Approval Level</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                leaveMulti.approval_level === "multi"
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {leaveMulti.approval_level === "multi" ? "Multi-Level" : "Single-Level"}
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => onChangeLeaveMulti("approval_level", "multi")}
              className={`py-1.5 px-2 rounded-xl font-semibold border text-center transition-all ${
                leaveMulti.approval_level === "multi"
                  ? "bg-purple-50 text-[#56348f] border-purple-300 dark:bg-purple-950/40 dark:border-purple-800"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
              }`}
            >
              Multi-Level
            </button>
            <button
              type="button"
              onClick={() => onChangeLeaveMulti("approval_level", "single")}
              className={`py-1.5 px-2 rounded-xl font-semibold border text-center transition-all ${
                leaveMulti.approval_level === "single"
                  ? "bg-purple-50 text-[#56348f] border-purple-300 dark:bg-purple-950/40 dark:border-purple-800"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
              }`}
            >
              Single-Level
            </button>
          </div>
        </div>

        {/* Primary TO Account */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Primary TO Account (Approver)
          </label>
          <select
            value={leaveMulti.to_user_id || 0}
            onChange={(e) => handleToAccount(onChangeLeaveMulti, Number(e.target.value) || null)}
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

        {/* CC Accounts */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              CC Accounts ({leaveMulti.cc_user_ids?.length || 0})
            </label>
            {leaveMulti.cc_user_ids?.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onChangeLeaveMulti("cc_user_ids", []);
                  onChangeLeaveMulti("cc_emails", []);
                }}
                className="text-[10px] text-rose-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search user to CC..."
              value={ccSearchMulti}
              onChange={(e) => setCcSearchMulti(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#56348f]"
            />
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            {filterUsers(ccSearchMulti).slice(0, 50).map((u) => {
              const isChecked = (leaveMulti.cc_user_ids || []).includes(u.id);
              return (
                <label
                  key={u.id}
                  className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 p-1 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCc(leaveMulti, onChangeLeaveMulti, u.id)}
                    className="rounded text-[#56348f] focus:ring-[#56348f]"
                  />
                  <span className="truncate">
                    {u.first_name} {u.last_name} ({u.email})
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MultiSelectUserPickerProps {
  availableUsers: any[];
  selectedIds: number[];
  onChangeSelectedIds: (ids: number[]) => void;
  title: string;
  placeholder?: string;
  emptyNotice?: string;
}

function MultiSelectUserPicker({
  availableUsers,
  selectedIds,
  onChangeSelectedIds,
  title,
  placeholder = "Search by name, code or email...",
  emptyNotice = "No matching users found.",
}: MultiSelectUserPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return availableUsers;
    const q = search.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.employee_code?.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q)
    );
  }, [availableUsers, search]);

  const toggleUser = (userId: number) => {
    if (selectedIds.includes(userId)) {
      onChangeSelectedIds(selectedIds.filter((id) => id !== userId));
    } else {
      onChangeSelectedIds([...selectedIds, userId]);
    }
  };

  const selectAll = () => {
    const allFilteredIds = filtered.map((u) => u.id);
    const combined = Array.from(new Set([...selectedIds, ...allFilteredIds]));
    onChangeSelectedIds(combined);
  };

  const deselectAll = () => {
    const filteredIdSet = new Set(filtered.map((u) => u.id));
    onChangeSelectedIds(selectedIds.filter((id) => !filteredIdSet.has(id)));
  };

  return (
    <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <span>{title}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#56348f]/10 text-[#56348f] dark:bg-purple-900/60 dark:text-purple-300">
            {selectedIds.length} selected
          </span>
        </label>
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={selectAll}
            className="text-[#56348f] dark:text-purple-300 font-semibold hover:underline"
          >
            Select All
          </button>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <button
            type="button"
            onClick={deselectAll}
            className="text-slate-500 hover:text-rose-500 font-semibold hover:underline"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-8 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#56348f]"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">{emptyNotice}</div>
        ) : (
          filtered.map((u) => {
            const isChecked = selectedIds.includes(u.id);
            return (
              <label
                key={u.id}
                className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                  isChecked
                    ? "bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleUser(u.id)}
                    className="rounded text-[#56348f] focus:ring-[#56348f]"
                  />
                  <div className="truncate">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {u.first_name} {u.last_name}
                    </span>
                    {u.employee_code && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {u.employee_code}
                      </span>
                    )}
                    <span className="block text-[11px] text-slate-400 truncate">{u.email}</span>
                  </div>
                </div>
                {u.designation && (
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2 hidden sm:inline">
                    {u.designation}
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function ApprovalRoutingTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [rules, setRules] = useState<ApprovalRoutingRules>({
    role_rules: {
      team_lead: createDefaultThreeCards(),
    },
    team_lead_rules: [],
    employee_rules: [],
  });

  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [teamLeads, setTeamLeads] = useState<any[]>([]);

  // Sub-tabs: 'role' (Team Leads) | 'employee' (Employee-Wise)
  const [subTab, setSubTab] = useState<"role" | "employee">("role");

  // Modal / Creator State for Team Lead Rules
  const [isTlModalOpen, setIsTlModalOpen] = useState(false);
  const [tlModalForm, setTlModalForm] = useState<TeamLeadApprovalRuleGroup>({
    id: "",
    name: "",
    team_lead_ids: [],
    ...createDefaultThreeCards(),
    enabled: true,
  });

  // Modal / Creator State for Employee Rules
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [empModalForm, setEmpModalForm] = useState<EmployeeApprovalRuleGroup>({
    id: "",
    name: "",
    user_ids: [],
    ...createDefaultThreeCards(),
    enabled: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data: ApprovalRoutingResponse = await emailSettingsApi.getApprovalRouting();
      if (data.rules) {
        setRules({
          ...data.rules,
          role_rules: {
            ...data.rules.role_rules,
            team_lead: {
              ...createDefaultThreeCards(),
              ...(data.rules.role_rules?.team_lead || {}),
            },
          },
          team_lead_rules: data.rules.team_lead_rules || [],
          employee_rules: data.rules.employee_rules || [],
        });
      }
      if (data.teams) {
        setTeams(data.teams);
      }
      if (data.users) {
        setUsers(data.users);
      }

      // Compute or set Team Leads list
      if (data.team_leads && data.team_leads.length > 0) {
        setTeamLeads(data.team_leads);
      } else if (data.teams && data.users) {
        // Fallback computation
        const tlIds = new Set(
          data.teams.map((t) => t.team_lead_id).filter((id): id is number => Boolean(id))
        );
        const leads = data.users.filter((u) => tlIds.has(u.id));
        setTeamLeads(leads);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to load approval routing rules."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isTlModalOpen || isEmpModalOpen) {
      document.body.classList.add("side-popup-open");
    } else {
      document.body.classList.remove("side-popup-open");
    }
    return () => {
      document.body.classList.remove("side-popup-open");
    };
  }, [isTlModalOpen, isEmpModalOpen]);

  // Compute all team leads assigned in any custom Team Lead rule
  const assignedTeamLeadIds = useMemo(() => {
    const ids = new Set<number>();
    (rules.team_lead_rules || []).forEach((r) => {
      (r.team_lead_ids || []).forEach((id) => ids.add(id));
    });
    return ids;
  }, [rules.team_lead_rules]);

  // Filter eligible employees for Employee-Wise routing:
  // "here in this list do not show team leads names if the team leads are already added emoail; and approval routing from Role-Wise (Team Leads) section"
  const eligibleEmployeesForEmployeeWise = useMemo(() => {
    return users.filter((u) => !assignedTeamLeadIds.has(u.id));
  }, [users, assignedTeamLeadIds]);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const payload: ApprovalRoutingRules = {
        role_rules: rules.role_rules,
        team_lead_rules: rules.team_lead_rules || [],
        employee_rules: rules.employee_rules || [],
      };
      const res = await emailSettingsApi.updateApprovalRouting(payload);
      setSuccessMessage(res.message || "Approval and email routing rules saved successfully.");
      if (res.data) {
        setRules({
          ...res.data,
          role_rules: {
            ...res.data.role_rules,
            team_lead: {
              ...createDefaultThreeCards(),
              ...(res.data.role_rules?.team_lead || {}),
            },
          },
          team_lead_rules: res.data.team_lead_rules || [],
          employee_rules: res.data.employee_rules || [],
        });
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to save approval routing rules."
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Team Lead Default Rule Updater ──
  const updateDefaultTlRule = (
    key: "wfh" | "leave_single_day" | "leave_multi_day",
    field: keyof RoleApprovalRule,
    value: any
  ) => {
    setRules((prev) => {
      const tl = prev.role_rules?.team_lead || createDefaultThreeCards();
      const current = tl[key] || createDefaultThreeCards()[key];
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

  // ── Team Lead Custom Rule Modal Handlers ──
  const openNewTlRuleModal = () => {
    setTlModalForm({
      id: "tl_rule_" + Date.now(),
      name: "",
      team_lead_ids: [],
      ...createDefaultThreeCards(),
      enabled: true,
    });
    setIsTlModalOpen(true);
  };

  const openEditTlRuleModal = (rule: TeamLeadApprovalRuleGroup) => {
    setTlModalForm({
      ...rule,
      wfh: { ...createDefaultThreeCards().wfh, ...(rule.wfh || {}) },
      leave_single_day: { ...createDefaultThreeCards().leave_single_day, ...(rule.leave_single_day || {}) },
      leave_multi_day: { ...createDefaultThreeCards().leave_multi_day, ...(rule.leave_multi_day || {}) },
    });
    setIsTlModalOpen(true);
  };

  const saveTlRuleModal = () => {
    if (tlModalForm.team_lead_ids.length === 0) {
      alert("Please select at least one Team Lead for this routing rule.");
      return;
    }

    setRules((prev) => {
      const existingRules = prev.team_lead_rules || [];
      const idx = existingRules.findIndex((r) => r.id === tlModalForm.id);
      let updated: TeamLeadApprovalRuleGroup[];
      if (idx >= 0) {
        updated = [...existingRules];
        updated[idx] = tlModalForm;
      } else {
        updated = [...existingRules, tlModalForm];
      }
      return { ...prev, team_lead_rules: updated };
    });

    setIsTlModalOpen(false);
  };

  const deleteTlRule = (id: string) => {
    setRules((prev) => ({
      ...prev,
      team_lead_rules: (prev.team_lead_rules || []).filter((r) => r.id !== id),
    }));
  };

  // ── Employee Rule Modal Handlers ──
  const openNewEmpRuleModal = () => {
    setEmpModalForm({
      id: "emp_rule_" + Date.now(),
      name: "",
      user_ids: [],
      ...createDefaultThreeCards(),
      enabled: true,
    });
    setIsEmpModalOpen(true);
  };

  const openEditEmpRuleModal = (rule: EmployeeApprovalRuleGroup) => {
    setEmpModalForm({
      ...rule,
      user_ids: rule.user_ids || (rule as any).user_id ? [(rule as any).user_id] : [],
      wfh: { ...createDefaultThreeCards().wfh, ...(rule.wfh || {}) },
      leave_single_day: { ...createDefaultThreeCards().leave_single_day, ...(rule.leave_single_day || {}) },
      leave_multi_day: { ...createDefaultThreeCards().leave_multi_day, ...(rule.leave_multi_day || {}) },
    });
    setIsEmpModalOpen(true);
  };

  const saveEmpRuleModal = () => {
    if (empModalForm.user_ids.length === 0) {
      alert("Please select at least one Employee for this routing rule.");
      return;
    }

    setRules((prev) => {
      const existingRules = prev.employee_rules || [];
      const idx = existingRules.findIndex((r) => r.id === empModalForm.id);
      let updated: EmployeeApprovalRuleGroup[];
      if (idx >= 0) {
        updated = [...existingRules];
        updated[idx] = empModalForm;
      } else {
        updated = [...existingRules, empModalForm];
      }
      return { ...prev, employee_rules: updated };
    });

    setIsEmpModalOpen(false);
  };

  const deleteEmpRule = (id: string) => {
    setRules((prev) => ({
      ...prev,
      employee_rules: (prev.employee_rules || []).filter((r) => r.id !== id),
    }));
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#56348f] animate-spin" />
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Loading approval & email routing configurations…
        </span>
      </div>
    );
  }

  const defaultTl = rules.role_rules?.team_lead || createDefaultThreeCards();

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold">{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-emerald-700 hover:opacity-75"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="font-semibold">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-rose-700 hover:opacity-75"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Global Fallback Notice */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/60 flex items-start gap-3 shadow-sm">
        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
            System Routing Invariant
          </h4>
          <p className="text-xs text-blue-700/90 dark:text-blue-300/80 leading-relaxed">
            Employee-specific rules take highest priority, followed by specific Team Lead rules, default role rules, and finally direct fallback to <strong>Super Admin</strong>.
          </p>
        </div>
      </div>

      {/* Sub-Tab Navigation (Role-Wise & Employee-Wise ONLY) */}
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
            {(rules.team_lead_rules?.length || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-[#56348f] dark:bg-purple-900/60 dark:text-purple-300">
                {rules.team_lead_rules?.length} custom
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
            <span>Employee-Wise Routing</span>
            {(rules.employee_rules?.length || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-[#56348f] dark:bg-purple-900/60 dark:text-purple-300">
                {rules.employee_rules?.length}
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
          SUB-TAB 1: ROLE-WISE (TEAM LEADS)
      ══════════════════════════════════════════════════════════════ */}
      {subTab === "role" && (
        <div className="space-y-6">
          {/* Header & Add Rule Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#56348f]" />
                <span>Team Leads Approval & Mail Routing</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                Create separate approval routing and email routing for specific Team Leads by checking their names. Any Team Lead without a dedicated rule follows the Default Team Lead configuration below.
              </p>
            </div>

            <button
              type="button"
              onClick={openNewTlRuleModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Separate Rule for Team Leads</span>
            </button>
          </div>

          {/* Section: Custom Team Lead Rules */}
          {(rules.team_lead_rules || []).length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Custom Team Lead Routing Rules ({rules.team_lead_rules?.length})</span>
                </h4>
              </div>

              <div className="space-y-4">
                {rules.team_lead_rules?.map((rule, idx) => {
                  const selectedLeads = teamLeads.filter((tl) =>
                    (rule.team_lead_ids || []).includes(tl.id)
                  );
                  return (
                    <div
                      key={rule.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#56348f] dark:bg-purple-950 dark:text-purple-300">
                              Rule #{idx + 1}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {rule.name || `Custom Routing for ${selectedLeads.length} Lead(s)`}
                            </h4>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] text-slate-400 font-medium">Assigned Leads:</span>
                            {selectedLeads.map((tl) => (
                              <span
                                key={tl.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                              >
                                <UserCheck2 className="w-3 h-3 text-[#56348f]" />
                                <span>
                                  {tl.first_name} {tl.last_name}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditTlRuleModal(rule)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Rule</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTlRule(rule.id)}
                            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Display Summary of the 3 Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        {/* WFH Summary */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Home className="w-3.5 h-3.5 text-purple-600" />
                              <span>WFH Routing</span>
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                rule.wfh?.enabled
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-slate-200 text-slate-600 dark:bg-slate-700"
                              }`}
                            >
                              {rule.wfh?.enabled ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Approver:{" "}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {users.find((u) => u.id === rule.wfh?.to_user_id)?.first_name ||
                                rule.wfh?.to_email ||
                                "Super Admin"}
                            </strong>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {rule.wfh?.approval_level === "multi" ? "Multi-Level" : "Single-Level"} •{" "}
                            {rule.wfh?.cc_user_ids?.length || 0} CC(s)
                          </div>
                        </div>

                        {/* 1-Day Leave Summary */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                              <span>1-Day Leave</span>
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                rule.leave_single_day?.enabled
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-slate-200 text-slate-600 dark:bg-slate-700"
                              }`}
                            >
                              {rule.leave_single_day?.enabled ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Approver:{" "}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {users.find((u) => u.id === rule.leave_single_day?.to_user_id)
                                ?.first_name ||
                                rule.leave_single_day?.to_email ||
                                "Super Admin"}
                            </strong>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {rule.leave_single_day?.approval_level === "multi"
                              ? "Multi-Level"
                              : "Single-Level"}{" "}
                            • {rule.leave_single_day?.cc_user_ids?.length || 0} CC(s)
                          </div>
                        </div>

                        {/* Multi-Day Leave Summary */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-amber-600" />
                              <span>Multi-Day Leave</span>
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                rule.leave_multi_day?.enabled
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-slate-200 text-slate-600 dark:bg-slate-700"
                              }`}
                            >
                              {rule.leave_multi_day?.enabled ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Approver:{" "}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {users.find((u) => u.id === rule.leave_multi_day?.to_user_id)
                                ?.first_name ||
                                rule.leave_multi_day?.to_email ||
                                "Super Admin"}
                            </strong>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {rule.leave_multi_day?.approval_level === "multi"
                              ? "Multi-Level"
                              : "Single-Level"}{" "}
                            • {rule.leave_multi_day?.cc_user_ids?.length || 0} CC(s)
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Default Team Leads Routing (Fallback for all remaining leads) */}
          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 space-y-1">
              <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#56348f]" />
                <span>Default Team Lead Routing (Fallback)</span>
              </h4>
              <p className="text-xs text-purple-700/80 dark:text-purple-300/80">
                Applied automatically to any Team Lead who is not checked in any custom rule above.
              </p>
            </div>

            <ThreeCardsEditor
              wfh={defaultTl.wfh}
              leaveSingle={defaultTl.leave_single_day}
              leaveMulti={defaultTl.leave_multi_day}
              users={users}
              onChangeWfh={(f, v) => updateDefaultTlRule("wfh", f, v)}
              onChangeLeaveSingle={(f, v) => updateDefaultTlRule("leave_single_day", f, v)}
              onChangeLeaveMulti={(f, v) => updateDefaultTlRule("leave_multi_day", f, v)}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SUB-TAB 2: EMPLOYEE-WISE RULES
      ══════════════════════════════════════════════════════════════ */}
      {subTab === "employee" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#56348f]" />
                <span>Employee-Wise Approval & Mail Routing</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                Configure dedicated approval and email routing cards for specific employees. Before allotting, you can search and multi-select employee names. Team Leads who are already configured under Role-Wise routing are excluded from this selection list.
              </p>
            </div>

            <button
              type="button"
              onClick={openNewEmpRuleModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee Rule</span>
            </button>
          </div>

          {(rules.employee_rules || []).length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <UserCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Employee Overrides Configured
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All employees are currently using their standard team lead and default approval routing.
              </p>
              <button
                onClick={openNewEmpRuleModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#56348f] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Employee Rule</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.employee_rules?.map((rule, idx) => {
                const ruleUserIds = rule.user_ids || ((rule as any).user_id ? [(rule as any).user_id] : []);
                const selectedEmps = users.filter((u) => ruleUserIds.includes(u.id));

                return (
                  <div
                    key={rule.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#56348f] dark:bg-purple-950 dark:text-purple-300">
                            Rule #{idx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {rule.name || `Routing for ${selectedEmps.length} Employee(s)`}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-slate-400 font-medium">Employees:</span>
                          {selectedEmps.map((emp) => (
                            <span
                              key={emp.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                            >
                              <UserCheck className="w-3 h-3 text-[#56348f]" />
                              <span>
                                {emp.first_name} {emp.last_name}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditEmpRuleModal(rule)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Rule</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEmpRule(rule.id)}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Display Summary of the 3 Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* WFH Summary */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Home className="w-3.5 h-3.5 text-purple-600" />
                            <span>WFH Routing</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              rule.wfh?.enabled
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-slate-200 text-slate-600 dark:bg-slate-700"
                            }`}
                          >
                            {rule.wfh?.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Approver:{" "}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {users.find((u) => u.id === rule.wfh?.to_user_id)?.first_name ||
                              rule.wfh?.to_email ||
                              "Super Admin"}
                          </strong>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {rule.wfh?.approval_level === "multi" ? "Multi-Level" : "Single-Level"} •{" "}
                          {rule.wfh?.cc_user_ids?.length || 0} CC(s)
                        </div>
                      </div>

                      {/* 1-Day Leave Summary */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            <span>1-Day Leave</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              rule.leave_single_day?.enabled
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-slate-200 text-slate-600 dark:bg-slate-700"
                            }`}
                          >
                            {rule.leave_single_day?.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Approver:{" "}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {users.find((u) => u.id === rule.leave_single_day?.to_user_id)
                              ?.first_name ||
                              rule.leave_single_day?.to_email ||
                              "Super Admin"}
                          </strong>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {rule.leave_single_day?.approval_level === "multi"
                            ? "Multi-Level"
                            : "Single-Level"}{" "}
                          • {rule.leave_single_day?.cc_user_ids?.length || 0} CC(s)
                        </div>
                      </div>

                      {/* Multi-Day Leave Summary */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-amber-600" />
                            <span>Multi-Day Leave</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              rule.leave_multi_day?.enabled
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-slate-200 text-slate-600 dark:bg-slate-700"
                              }`}
                          >
                            {rule.leave_multi_day?.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Approver:{" "}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {users.find((u) => u.id === rule.leave_multi_day?.to_user_id)
                              ?.first_name ||
                              rule.leave_multi_day?.to_email ||
                              "Super Admin"}
                          </strong>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {rule.leave_multi_day?.approval_level === "multi"
                            ? "Multi-Level"
                            : "Single-Level"}{" "}
                          • {rule.leave_multi_day?.cc_user_ids?.length || 0} CC(s)
                        </div>
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
          SIDE POPUP DRAWER: TEAM LEAD ROUTING RULE
      ══════════════════════════════════════════════════════════════ */}
      {isTlModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] overflow-hidden font-sans" data-side-popup="true">
            {/* Backdrop */}
            <div
              onClick={() => setIsTlModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            />

            {/* Side Drawer */}
            <div
              data-side-popup="true"
              className="fixed inset-y-0 right-0 w-full sm:w-[680px] md:w-[820px] lg:w-[980px] xl:w-[1100px] max-w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-[99999] animate-in slide-in-from-right duration-300 overflow-hidden"
            >
              {/* Sticky Top Header */}
              <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {tlModalForm.id.includes(Date.now().toString().slice(0, 5))
                        ? "Create Separate Rule for Team Leads"
                        : "Edit Team Lead Routing Rule"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Check specific Team Lead names and configure their 3 routing cards
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTlModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Rule Name / Label */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Rule Label (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend Team Leads Routing or Senior TLs"
                    value={tlModalForm.name || ""}
                    onChange={(e) => setTlModalForm({ ...tlModalForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#56348f]"
                  />
                </div>

                {/* Check Team Lead Names (Search & Multi-Select) */}
                <MultiSelectUserPicker
                  availableUsers={teamLeads.length > 0 ? teamLeads : users}
                  selectedIds={tlModalForm.team_lead_ids}
                  onChangeSelectedIds={(ids) => setTlModalForm({ ...tlModalForm, team_lead_ids: ids })}
                  title="Select Team Leads for this Rule"
                  placeholder="Search team lead by name, code or email..."
                  emptyNotice="No team leads found."
                />

                {/* The 3 Cards for Team Lead Routing */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Routing Cards for Selected Team Leads
                  </h4>
                  <ThreeCardsEditor
                    wfh={tlModalForm.wfh}
                    leaveSingle={tlModalForm.leave_single_day}
                    leaveMulti={tlModalForm.leave_multi_day}
                    users={users}
                    onChangeWfh={(f, v) =>
                      setTlModalForm({
                        ...tlModalForm,
                        wfh: { ...tlModalForm.wfh, [f]: v },
                      })
                    }
                    onChangeLeaveSingle={(f, v) =>
                      setTlModalForm({
                        ...tlModalForm,
                        leave_single_day: { ...tlModalForm.leave_single_day, [f]: v },
                      })
                    }
                    onChangeLeaveMulti={(f, v) =>
                      setTlModalForm({
                        ...tlModalForm,
                        leave_multi_day: { ...tlModalForm.leave_multi_day, [f]: v },
                      })
                    }
                  />
                </div>
              </div>

              {/* Sticky Bottom Actions */}
              <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsTlModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveTlRuleModal}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#56348f] text-white hover:bg-[#462875] shadow-md shadow-purple-900/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Team Lead Rule</span>
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SIDE POPUP DRAWER: EMPLOYEE ROUTING RULE
      ══════════════════════════════════════════════════════════════ */}
      {isEmpModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] overflow-hidden font-sans" data-side-popup="true">
            {/* Backdrop */}
            <div
              onClick={() => setIsEmpModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            />

            {/* Side Drawer */}
            <div
              data-side-popup="true"
              className="fixed inset-y-0 right-0 w-full sm:w-[680px] md:w-[820px] lg:w-[980px] xl:w-[1100px] max-w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-[99999] animate-in slide-in-from-right duration-300 overflow-hidden"
            >
              {/* Sticky Top Header */}
              <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {empModalForm.id.includes(Date.now().toString().slice(0, 5))
                        ? "Create Employee-Wise Routing Rule"
                        : "Edit Employee-Wise Routing Rule"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Choose employee names (multi-select) and configure the 3 routing cards
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Rule Name / Label */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Rule Label (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Marketing Executives or Trainee Staff Routing"
                    value={empModalForm.name || ""}
                    onChange={(e) => setEmpModalForm({ ...empModalForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#56348f]"
                  />
                </div>

                {/* Check Employee Names (Search & Multi-Select with Team Lead Filter) */}
                <MultiSelectUserPicker
                  availableUsers={eligibleEmployeesForEmployeeWise}
                  selectedIds={empModalForm.user_ids}
                  onChangeSelectedIds={(ids) => setEmpModalForm({ ...empModalForm, user_ids: ids })}
                  title="Select Employees for this Rule"
                  placeholder="Search employee by name, code or email..."
                  emptyNotice="No eligible employees found (Team Leads already added in Role-Wise are excluded)."
                />

                {/* The SAME 3 CARDS as in Role-Wise (Team Leads) */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Routing Cards for Selected Employees
                  </h4>
                  <ThreeCardsEditor
                    wfh={empModalForm.wfh}
                    leaveSingle={empModalForm.leave_single_day}
                    leaveMulti={empModalForm.leave_multi_day}
                    users={users}
                    onChangeWfh={(f, v) =>
                      setEmpModalForm({
                        ...empModalForm,
                        wfh: { ...empModalForm.wfh, [f]: v },
                      })
                    }
                    onChangeLeaveSingle={(f, v) =>
                      setEmpModalForm({
                        ...empModalForm,
                        leave_single_day: { ...empModalForm.leave_single_day, [f]: v },
                      })
                    }
                    onChangeLeaveMulti={(f, v) =>
                      setEmpModalForm({
                        ...empModalForm,
                        leave_multi_day: { ...empModalForm.leave_multi_day, [f]: v },
                      })
                    }
                  />
                </div>
              </div>

              {/* Sticky Bottom Actions */}
              <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEmpRuleModal}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#56348f] text-white hover:bg-[#462875] shadow-md shadow-purple-900/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Employee Rule</span>
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
