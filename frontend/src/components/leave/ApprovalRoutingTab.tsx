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
  Building2,
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

const createDefaultCards = (): {
  wfh: RoleApprovalRule;
  wfh_multi_day: RoleApprovalRule;
  leave_single_day: RoleApprovalRule;
  leave_multi_day: RoleApprovalRule;
} => ({
  wfh: {
    to_user_id: null,
    to_email: null,
    to_user_id_2: null,
    to_email_2: "admin@intersmart.in",
    cc_user_ids: [],
    cc_emails: ["hr@intersmart.in", "admin@intersmart.in"],
    approval_level: "multi",
    enabled: true,
  },
  wfh_multi_day: {
    to_user_id: null,
    to_email: null,
    to_user_id_2: null,
    to_email_2: "admin@intersmart.in",
    cc_user_ids: [],
    cc_emails: ["hr@intersmart.in", "admin@intersmart.in"],
    approval_level: "multi",
    enabled: true,
  },
  leave_single_day: {
    to_user_id: null,
    to_email: null,
    to_user_id_2: null,
    to_email_2: "admin@intersmart.in",
    cc_user_ids: [],
    cc_emails: ["hr@intersmart.in", "admin@intersmart.in"],
    approval_level: "single",
    enabled: true,
  },
  leave_multi_day: {
    to_user_id: null,
    to_email: null,
    to_user_id_2: null,
    to_email_2: "admin@intersmart.in",
    cc_user_ids: [],
    cc_emails: ["hr@intersmart.in", "admin@intersmart.in"],
    approval_level: "multi",
    enabled: true,
  },
});

const createDefaultThreeCards = createDefaultCards;

export const getCcCount = (card?: RoleApprovalRule | null, allUsers?: any[]): number => {
  if (!card) return 0;
  const idSet = new Set((card.cc_user_ids || []).map(Number));
  const emailSet = new Set((card.cc_emails || []).map((e) => String(e).trim().toLowerCase()));

  if (allUsers && allUsers.length > 0) {
    allUsers.forEach((u) => {
      if (u.email && emailSet.has(u.email.trim().toLowerCase())) {
        idSet.add(Number(u.id));
      }
      if (idSet.has(Number(u.id)) && u.email) {
        emailSet.add(u.email.trim().toLowerCase());
      }
    });
  }

  const count = Math.max(idSet.size, emailSet.size);
  // If card is enabled and has no explicit CCs defined, fallback to default 2 CCs (hr@intersmart.in, admin@intersmart.in)
  if (count === 0 && (card.enabled ?? true) && (card.cc_user_ids === undefined || card.cc_emails === undefined)) {
    return 2;
  }
  return count;
};

export const normalizeCard = (card: RoleApprovalRule, allUsers: any[]): RoleApprovalRule => {
  const existingIds = new Set((card.cc_user_ids || []).map(Number));
  const existingEmails = new Set((card.cc_emails || []).map((e) => String(e).trim().toLowerCase()));

  // Map any emails in cc_emails to user IDs
  allUsers.forEach((u) => {
    if (u.email && existingEmails.has(u.email.toLowerCase().trim())) {
      existingIds.add(Number(u.id));
    }
  });

  // Map any IDs in cc_user_ids to user emails
  allUsers.forEach((u) => {
    if (existingIds.has(Number(u.id)) && u.email) {
      existingEmails.add(u.email.toLowerCase().trim());
    }
  });

  const finalEmails = Array.from(existingEmails).map((em) => {
    const match = allUsers.find((u) => u.email?.toLowerCase().trim() === em);
    return match?.email?.trim() || em;
  });

  return {
    ...card,
    cc_user_ids: Array.from(existingIds),
    cc_emails: finalEmails,
  };
};

export const normalizeRuleGroup = <T extends TeamLeadApprovalRuleGroup | EmployeeApprovalRuleGroup>(
  rule: T,
  allUsers: any[]
): T => {
  const defaults = createDefaultCards();
  return {
    ...rule,
    wfh: normalizeCard({ ...defaults.wfh, ...(rule.wfh || {}) }, allUsers),
    wfh_multi_day: normalizeCard(
      { ...defaults.wfh_multi_day, ...(rule.wfh_multi_day || rule.wfh || {}) },
      allUsers
    ),
    leave_single_day: normalizeCard(
      { ...defaults.leave_single_day, ...(rule.leave_single_day || {}) },
      allUsers
    ),
    leave_multi_day: normalizeCard(
      { ...defaults.leave_multi_day, ...(rule.leave_multi_day || {}) },
      allUsers
    ),
  };
};

interface ThreeCardsEditorProps {
  wfh: RoleApprovalRule;
  wfhMulti?: RoleApprovalRule;
  leaveSingle: RoleApprovalRule;
  leaveMulti: RoleApprovalRule;
  users: any[];
  onUpdateWfh: (updated: RoleApprovalRule) => void;
  onUpdateWfhMulti?: (updated: RoleApprovalRule) => void;
  onUpdateLeaveSingle: (updated: RoleApprovalRule) => void;
  onUpdateLeaveMulti: (updated: RoleApprovalRule) => void;
}

function ThreeCardsEditor({
  wfh,
  wfhMulti,
  leaveSingle,
  leaveMulti,
  users,
  onUpdateWfh,
  onUpdateWfhMulti,
  onUpdateLeaveSingle,
  onUpdateLeaveMulti,
}: ThreeCardsEditorProps) {
  const [ccSearchWfh, setCcSearchWfh] = useState("");
  const [ccSearchWfhMulti, setCcSearchWfhMulti] = useState("");
  const [ccSearchSingle, setCcSearchSingle] = useState("");
  const [ccSearchMulti, setCcSearchMulti] = useState("");

  const handleToAccount = (
    currentRule: RoleApprovalRule,
    updater: (updated: RoleApprovalRule) => void,
    userId: number | null
  ) => {
    if (!userId || userId === 0) {
      updater({
        ...currentRule,
        to_user_id: null,
        to_email: null,
      });
      return;
    }
    const u = users.find((usr) => Number(usr.id) === Number(userId));
    updater({
      ...currentRule,
      to_user_id: userId,
      to_email: u?.email || null,
    });
  };

  const handleToAccount2 = (
    currentRule: RoleApprovalRule,
    updater: (updated: RoleApprovalRule) => void,
    userId: number | null
  ) => {
    if (!userId || userId === 0) {
      updater({
        ...currentRule,
        to_user_id_2: null,
        to_email_2: "admin@intersmart.in",
      });
      return;
    }
    const u = users.find((usr) => Number(usr.id) === Number(userId));
    updater({
      ...currentRule,
      to_user_id_2: userId,
      to_email_2: u?.email || "admin@intersmart.in",
    });
  };

  const toggleCc = (
    currentRule: RoleApprovalRule,
    updater: (updated: RoleApprovalRule) => void,
    targetUser: any
  ) => {
    const userId = Number(targetUser.id);
    const userEmail = (targetUser.email || "").trim().toLowerCase();

    const existingIds = new Set((currentRule.cc_user_ids || []).map(Number));
    const existingEmails = new Set((currentRule.cc_emails || []).map((e) => String(e).trim().toLowerCase()));

    const isChecked = existingIds.has(userId) || (Boolean(userEmail) && existingEmails.has(userEmail));

    if (isChecked) {
      existingIds.delete(userId);
      if (userEmail) existingEmails.delete(userEmail);
    } else {
      existingIds.add(userId);
      if (userEmail) existingEmails.add(userEmail);
    }

    const finalEmails = Array.from(existingEmails).map((em) => {
      const match = users.find((u) => u.email?.toLowerCase().trim() === em);
      return match?.email?.trim() || em;
    });

    updater({
      ...currentRule,
      cc_user_ids: Array.from(existingIds),
      cc_emails: finalEmails,
    });
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

  // Helper renderer for a single rule card
  const renderCard = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    rule: RoleApprovalRule,
    updater: (updated: RoleApprovalRule) => void,
    ccSearch: string,
    setCcSearch: (s: string) => void
  ) => {
    const isMulti = rule.approval_level === "multi";
    return (
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        {/* Card Header & Enabled Switch */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {icon}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{title}</h4>
              <span className="text-[11px] text-slate-400">{subtitle}</span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rule.enabled ?? true}
              onChange={(e) => updater({ ...rule, enabled: e.target.checked })}
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
                isMulti
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {isMulti ? "Multi-Level (2 Approvers)" : "Single-Level"}
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                updater({
                  ...rule,
                  approval_level: "multi",
                  to_user_id_2: rule.to_user_id_2 ?? null,
                  to_email_2: rule.to_email_2 || "admin@intersmart.in",
                })
              }
              className={`py-1.5 px-2 rounded-xl font-semibold border text-center transition-all cursor-pointer ${
                isMulti
                  ? "bg-purple-50 text-[#56348f] border-purple-300 dark:bg-purple-950/40 dark:border-purple-800"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
              }`}
            >
              Multi-Level
            </button>
            <button
              type="button"
              onClick={() => updater({ ...rule, approval_level: "single" })}
              className={`py-1.5 px-2 rounded-xl font-semibold border text-center transition-all cursor-pointer ${
                !isMulti
                  ? "bg-purple-50 text-[#56348f] border-purple-300 dark:bg-purple-950/40 dark:border-purple-800"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
              }`}
            >
              Single-Level
            </button>
          </div>
        </div>

        {/* Primary TO Account (Level 1 Approver) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Primary Approver {isMulti ? "(Level 1)" : ""}
          </label>
          <select
            value={rule.to_user_id || 0}
            onChange={(e) => handleToAccount(rule, updater, Number(e.target.value) || null)}
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

        {/* Second TO Account (Level 2 Approver - Default Super Admin) */}
        {isMulti && (
          <div className="space-y-1.5 p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Second Approver (Level 2)
              </label>
              <span className="text-[10px] font-semibold text-[#56348f] dark:text-purple-300">
                Default: Super Admin
              </span>
            </div>
            <select
              value={rule.to_user_id_2 || 0}
              onChange={(e) => handleToAccount2(rule, updater, Number(e.target.value) || null)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#56348f]"
            >
              <option value={0}>-- Super Admin (admin@intersmart.in) [Default] --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name} ({u.employee_code || `ID ${u.id}`}) — {u.email}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* CC Accounts */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              CC Accounts ({getCcCount(rule)})
            </label>
            {(rule.cc_user_ids?.length > 0 || (rule.cc_emails?.length || 0) > 0) && (
              <button
                type="button"
                onClick={() =>
                  updater({
                    ...rule,
                    cc_user_ids: [],
                    cc_emails: [],
                  })
                }
                className="text-[10px] text-rose-500 hover:underline cursor-pointer"
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
              value={ccSearch}
              onChange={(e) => setCcSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#56348f]"
            />
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            {filterUsers(ccSearch).slice(0, 50).map((u) => {
              const userEmail = (u.email || "").trim().toLowerCase();
              const isChecked =
                (rule.cc_user_ids || []).map(Number).includes(Number(u.id)) ||
                (Boolean(userEmail) &&
                  (rule.cc_emails || []).some((em) => String(em).trim().toLowerCase() === userEmail));

              return (
                <div
                  key={u.id}
                  onClick={() => toggleCc(rule, updater, u)}
                  className={`flex items-center gap-2 text-[11px] p-1.5 rounded-lg cursor-pointer select-none transition-colors ${
                    isChecked
                      ? "bg-purple-100/70 text-[#56348f] dark:bg-purple-950/60 dark:text-purple-300 font-semibold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="rounded text-[#56348f] focus:ring-[#56348f] pointer-events-none"
                  />
                  <span className="truncate">
                    {u.first_name} {u.last_name} ({u.email})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {renderCard(
        "1-Day WFH",
        "Single-day remote work",
        <Home className="w-4 h-4 text-purple-600" />,
        wfh,
        onUpdateWfh,
        ccSearchWfh,
        setCcSearchWfh
      )}
      {wfhMulti && onUpdateWfhMulti && renderCard(
        "Multi-Day WFH",
        "Remote work (> 1 day)",
        <Building2 className="w-4 h-4 text-indigo-600" />,
        wfhMulti,
        onUpdateWfhMulti,
        ccSearchWfhMulti,
        setCcSearchWfhMulti
      )}
      {renderCard(
        "1-Day Leave",
        "Casual / Sick (1 day only)",
        <Calendar className="w-4 h-4 text-emerald-600" />,
        leaveSingle,
        onUpdateLeaveSingle,
        ccSearchSingle,
        setCcSearchSingle
      )}
      {renderCard(
        "Multi-Day Leave",
        "Casual / Sick (> 1 day)",
        <Layers className="w-4 h-4 text-amber-600" />,
        leaveMulti,
        onUpdateLeaveMulti,
        ccSearchMulti,
        setCcSearchMulti
      )}
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
      const loadedUsers = data.users || [];
      if (data.users) {
        setUsers(data.users);
      }
      if (data.teams) {
        setTeams(data.teams);
      }
      if (data.rules) {
        const normalizedTlRules = (data.rules.team_lead_rules || []).map((r) =>
          normalizeRuleGroup(r, loadedUsers)
        );
        const normalizedEmpRules = (data.rules.employee_rules || []).map((r) =>
          normalizeRuleGroup(r, loadedUsers)
        );
        setRules({
          ...data.rules,
          role_rules: {
            ...data.rules.role_rules,
            team_lead: {
              ...createDefaultCards(),
              ...(data.rules.role_rules?.team_lead || {}),
            },
          },
          team_lead_rules: normalizedTlRules,
          employee_rules: normalizedEmpRules,
        });
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
              ...createDefaultCards(),
              ...(res.data.role_rules?.team_lead || {}),
            },
          },
          team_lead_rules: (res.data.team_lead_rules || []).map((r: any) =>
            normalizeRuleGroup(r, users)
          ),
          employee_rules: (res.data.employee_rules || []).map((r: any) =>
            normalizeRuleGroup(r, users)
          ),
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
  const updateDefaultTlRuleCard = (
    key: "wfh" | "wfh_multi_day" | "leave_single_day" | "leave_multi_day",
    updatedCard: RoleApprovalRule
  ) => {
    setRules((prev) => {
      const tl = prev.role_rules?.team_lead || createDefaultCards();
      return {
        ...prev,
        role_rules: {
          ...prev.role_rules,
          team_lead: {
            ...tl,
            [key]: updatedCard,
          },
        },
      };
    });
  };

  // ── Team Lead Custom Rule Modal Handlers ──
  const openNewTlRuleModal = () => {
    const defaults = createDefaultCards();
    setTlModalForm({
      id: "tl_rule_" + Date.now(),
      name: "",
      team_lead_ids: [],
      wfh: normalizeCard(defaults.wfh, users),
      wfh_multi_day: normalizeCard(defaults.wfh_multi_day, users),
      leave_single_day: normalizeCard(defaults.leave_single_day, users),
      leave_multi_day: normalizeCard(defaults.leave_multi_day, users),
      enabled: true,
    });
    setIsTlModalOpen(true);
  };

  const openEditTlRuleModal = (rule: TeamLeadApprovalRuleGroup) => {
    const defaults = createDefaultCards();
    setTlModalForm({
      ...rule,
      wfh: normalizeCard({ ...defaults.wfh, ...(rule.wfh || {}) }, users),
      wfh_multi_day: normalizeCard({ ...defaults.wfh_multi_day, ...(rule.wfh_multi_day || rule.wfh || {}) }, users),
      leave_single_day: normalizeCard({ ...defaults.leave_single_day, ...(rule.leave_single_day || {}) }, users),
      leave_multi_day: normalizeCard({ ...defaults.leave_multi_day, ...(rule.leave_multi_day || {}) }, users),
    });
    setIsTlModalOpen(true);
  };

  const saveTlRuleModal = async () => {
    if (tlModalForm.team_lead_ids.length === 0) {
      alert("Please select at least one Team Lead for this routing rule.");
      return;
    }

    const existingRules = rules.team_lead_rules || [];
    const idx = existingRules.findIndex((r) => r.id === tlModalForm.id);
    const normalizedForm = normalizeRuleGroup(tlModalForm, users);
    let updatedTlRules: TeamLeadApprovalRuleGroup[];
    if (idx >= 0) {
      updatedTlRules = [...existingRules];
      updatedTlRules[idx] = normalizedForm;
    } else {
      updatedTlRules = [...existingRules, normalizedForm];
    }

    const updatedRules: ApprovalRoutingRules = {
      ...rules,
      team_lead_rules: updatedTlRules,
    };

    setRules(updatedRules);
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const payload: ApprovalRoutingRules = {
        role_rules: rules.role_rules,
        team_lead_rules: updatedTlRules,
        employee_rules: rules.employee_rules || [],
      };
      const res = await emailSettingsApi.updateApprovalRouting(payload);
      setSuccessMessage(res.message || "Team Lead routing rule saved successfully.");
      if (res.data) {
        setRules((prev) => ({
          ...prev,
          ...res.data,
          team_lead_rules: (res.data.team_lead_rules || updatedTlRules).map((r: any) =>
            normalizeRuleGroup(r, users)
          ),
          employee_rules: (res.data.employee_rules || prev.employee_rules || []).map((r: any) =>
            normalizeRuleGroup(r, users)
          ),
        }));
      }
      setIsTlModalOpen(false);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to save Team Lead routing rule."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteTlRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Team Lead routing rule?")) return;
    const updatedTlRules = (rules.team_lead_rules || []).filter((r) => r.id !== id);
    const updatedRules: ApprovalRoutingRules = { ...rules, team_lead_rules: updatedTlRules };
    setRules(updatedRules);
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await emailSettingsApi.updateApprovalRouting(updatedRules);
      setSuccessMessage("Team Lead routing rule deleted successfully.");
      if (res.data) {
        setRules((prev) => ({
          ...prev,
          ...res.data,
          team_lead_rules: (res.data.team_lead_rules || updatedTlRules).map((r: any) =>
            normalizeRuleGroup(r, users)
          ),
          employee_rules: (res.data.employee_rules || prev.employee_rules || []).map((r: any) =>
            normalizeRuleGroup(r, users)
          ),
        }));
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to delete rule.");
    } finally {
      setSaving(false);
    }
  };

  // ── Employee Rule Modal Handlers ──
  const openNewEmpRuleModal = () => {
    const defaults = createDefaultCards();
    setEmpModalForm({
      id: "emp_rule_" + Date.now(),
      name: "",
      user_ids: [],
      wfh: normalizeCard(defaults.wfh, users),
      wfh_multi_day: normalizeCard(defaults.wfh_multi_day, users),
      leave_single_day: normalizeCard(defaults.leave_single_day, users),
      leave_multi_day: normalizeCard(defaults.leave_multi_day, users),
      enabled: true,
    });
    setIsEmpModalOpen(true);
  };

  const openEditEmpRuleModal = (rule: EmployeeApprovalRuleGroup) => {
    const defaults = createDefaultCards();
    setEmpModalForm({
      ...rule,
      user_ids: rule.user_ids || ((rule as any).user_id ? [(rule as any).user_id] : []),
      wfh: normalizeCard({ ...defaults.wfh, ...(rule.wfh || {}) }, users),
      wfh_multi_day: normalizeCard({ ...defaults.wfh_multi_day, ...(rule.wfh_multi_day || rule.wfh || {}) }, users),
      leave_single_day: normalizeCard({ ...defaults.leave_single_day, ...(rule.leave_single_day || {}) }, users),
      leave_multi_day: normalizeCard({ ...defaults.leave_multi_day, ...(rule.leave_multi_day || {}) }, users),
    });
    setIsEmpModalOpen(true);
  };

  const saveEmpRuleModal = async () => {
    if (empModalForm.user_ids.length === 0) {
      alert("Please select at least one Employee for this routing rule.");
      return;
    }

    const existingRules = rules.employee_rules || [];
    const idx = existingRules.findIndex((r) => r.id === empModalForm.id);
    const normalizedForm = normalizeRuleGroup(empModalForm, users);
    let updatedEmpRules: EmployeeApprovalRuleGroup[];
    if (idx >= 0) {
      updatedEmpRules = [...existingRules];
      updatedEmpRules[idx] = normalizedForm;
    } else {
      updatedEmpRules = [...existingRules, normalizedForm];
    }

    const updatedRules: ApprovalRoutingRules = {
      ...rules,
      employee_rules: updatedEmpRules,
    };

    setRules(updatedRules);
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const payload: ApprovalRoutingRules = {
        role_rules: rules.role_rules,
        team_lead_rules: rules.team_lead_rules || [],
        employee_rules: updatedEmpRules,
      };
      const res = await emailSettingsApi.updateApprovalRouting(payload);
      setSuccessMessage(res.message || "Employee routing rule saved successfully.");
      if (res.data) {
        setRules((prev) => ({
          ...prev,
          ...res.data,
          team_lead_rules: (res.data.team_lead_rules || prev.team_lead_rules || []).map((r: any) =>
            normalizeRuleGroup(r, users)
          ),
          employee_rules: (res.data.employee_rules || updatedEmpRules).map((r: any) =>
            normalizeRuleGroup(r, users)
          ),
        }));
      }
      setIsEmpModalOpen(false);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to save Employee routing rule."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteEmpRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Employee routing rule?")) return;
    const updatedEmpRules = (rules.employee_rules || []).filter((r) => r.id !== id);
    const updatedRules: ApprovalRoutingRules = { ...rules, employee_rules: updatedEmpRules };
    setRules(updatedRules);
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await emailSettingsApi.updateApprovalRouting(updatedRules);
      setSuccessMessage("Employee routing rule deleted successfully.");
      if (res.data) {
        setRules((prev) => ({
          ...prev,
          ...res.data,
          team_lead_rules: (res.data.team_lead_rules || prev.team_lead_rules || []).map((r: any) =>
            normalizeRuleGroup(r, users)
          ),
          employee_rules: (res.data.employee_rules || updatedEmpRules).map((r: any) =>
            normalizeRuleGroup(r, users)
          ),
        }));
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to delete rule.");
    } finally {
      setSaving(false);
    }
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

  const defaultTl = rules.role_rules?.team_lead || createDefaultCards();

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

                      {/* Display Summary of the 4 Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        {/* 1-Day WFH Summary */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Home className="w-3.5 h-3.5 text-purple-600" />
                              <span>1-Day WFH</span>
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
                            {rule.wfh?.approval_level === "multi" && (
                              <span className="text-[#56348f] dark:text-purple-300 font-semibold">
                                {" "}→ {users.find((u) => u.id === rule.wfh?.to_user_id_2)?.first_name || rule.wfh?.to_email_2 || "Super Admin"}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {rule.wfh?.approval_level === "multi" ? "Multi-Level" : "Single-Level"} •{" "}
                            {getCcCount(rule.wfh, users)} CC(s)
                          </div>
                        </div>

                        {/* Multi-Day WFH Summary */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Multi-Day WFH</span>
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                (rule.wfh_multi_day || rule.wfh)?.enabled
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-slate-200 text-slate-600 dark:bg-slate-700"
                              }`}
                            >
                              {(rule.wfh_multi_day || rule.wfh)?.enabled ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Approver:{" "}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {users.find((u) => u.id === (rule.wfh_multi_day || rule.wfh)?.to_user_id)?.first_name ||
                                (rule.wfh_multi_day || rule.wfh)?.to_email ||
                                "Super Admin"}
                            </strong>
                            {(rule.wfh_multi_day || rule.wfh)?.approval_level === "multi" && (
                              <span className="text-[#56348f] dark:text-purple-300 font-semibold">
                                {" "}→ {users.find((u) => u.id === (rule.wfh_multi_day || rule.wfh)?.to_user_id_2)?.first_name || (rule.wfh_multi_day || rule.wfh)?.to_email_2 || "Super Admin"}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {(rule.wfh_multi_day || rule.wfh)?.approval_level === "multi" ? "Multi-Level" : "Single-Level"} •{" "}
                            {getCcCount(rule.wfh_multi_day || rule.wfh, users)} CC(s)
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
                            {rule.leave_single_day?.approval_level === "multi" && (
                              <span className="text-[#56348f] dark:text-purple-300 font-semibold">
                                {" "}→ {users.find((u) => u.id === rule.leave_single_day?.to_user_id_2)?.first_name || rule.leave_single_day?.to_email_2 || "Super Admin"}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {rule.leave_single_day?.approval_level === "multi"
                              ? "Multi-Level"
                              : "Single-Level"}{" "}
                            • {getCcCount(rule.leave_single_day, users)} CC(s)
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
                            {rule.leave_multi_day?.approval_level === "multi" && (
                              <span className="text-[#56348f] dark:text-purple-300 font-semibold">
                                {" "}→ {users.find((u) => u.id === rule.leave_multi_day?.to_user_id_2)?.first_name || rule.leave_multi_day?.to_email_2 || "Super Admin"}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {rule.leave_multi_day?.approval_level === "multi"
                              ? "Multi-Level"
                              : "Single-Level"}{" "}
                            • {getCcCount(rule.leave_multi_day, users)} CC(s)
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
              wfhMulti={defaultTl.wfh_multi_day || defaultTl.wfh}
              leaveSingle={defaultTl.leave_single_day}
              leaveMulti={defaultTl.leave_multi_day}
              users={users}
              onUpdateWfh={(updated) => updateDefaultTlRuleCard("wfh", updated)}
              onUpdateWfhMulti={(updated) => updateDefaultTlRuleCard("wfh_multi_day", updated)}
              onUpdateLeaveSingle={(updated) => updateDefaultTlRuleCard("leave_single_day", updated)}
              onUpdateLeaveMulti={(updated) => updateDefaultTlRuleCard("leave_multi_day", updated)}
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

                    {/* Display Summary of the 4 Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      {/* 1-Day WFH Summary */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Home className="w-3.5 h-3.5 text-purple-600" />
                            <span>1-Day WFH</span>
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
                          {rule.wfh?.approval_level === "multi" && (
                            <span className="text-[#56348f] dark:text-purple-300 font-semibold">
                              {" "}→ {users.find((u) => u.id === rule.wfh?.to_user_id_2)?.first_name || rule.wfh?.to_email_2 || "Super Admin"}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {rule.wfh?.approval_level === "multi" ? "Multi-Level" : "Single-Level"} •{" "}
                          {getCcCount(rule.wfh, users)} CC(s)
                        </div>
                      </div>

                      {/* Multi-Day WFH Summary */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Multi-Day WFH</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              (rule.wfh_multi_day || rule.wfh)?.enabled
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-slate-200 text-slate-600 dark:bg-slate-700"
                            }`}
                          >
                            {(rule.wfh_multi_day || rule.wfh)?.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Approver:{" "}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {users.find((u) => u.id === (rule.wfh_multi_day || rule.wfh)?.to_user_id)?.first_name ||
                              (rule.wfh_multi_day || rule.wfh)?.to_email ||
                              "Super Admin"}
                          </strong>
                          {(rule.wfh_multi_day || rule.wfh)?.approval_level === "multi" && (
                              <span className="text-[#56348f] dark:text-purple-300 font-semibold">
                                {" "}→ {users.find((u) => u.id === (rule.wfh_multi_day || rule.wfh)?.to_user_id_2)?.first_name || (rule.wfh_multi_day || rule.wfh)?.to_email_2 || "Super Admin"}
                              </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {(rule.wfh_multi_day || rule.wfh)?.approval_level === "multi" ? "Multi-Level" : "Single-Level"} •{" "}
                          {getCcCount(rule.wfh_multi_day || rule.wfh, users)} CC(s)
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
                          {rule.leave_single_day?.approval_level === "multi" && (
                            <span className="text-[#56348f] dark:text-purple-300 font-semibold">
                              {" "}→ {users.find((u) => u.id === rule.leave_single_day?.to_user_id_2)?.first_name || rule.leave_single_day?.to_email_2 || "Super Admin"}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {rule.leave_single_day?.approval_level === "multi"
                            ? "Multi-Level"
                            : "Single-Level"}{" "}
                          • {getCcCount(rule.leave_single_day, users)} CC(s)
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
                          {rule.leave_multi_day?.approval_level === "multi" && (
                            <span className="text-[#56348f] dark:text-purple-300 font-semibold">
                              {" "}→ {users.find((u) => u.id === rule.leave_multi_day?.to_user_id_2)?.first_name || rule.leave_multi_day?.to_email_2 || "Super Admin"}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {rule.leave_multi_day?.approval_level === "multi"
                            ? "Multi-Level"
                            : "Single-Level"}{" "}
                          • {getCcCount(rule.leave_multi_day, users)} CC(s)
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

                {/* The 4 Cards for Team Lead Routing */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Routing Cards for Selected Team Leads
                  </h4>
                  <ThreeCardsEditor
                    wfh={tlModalForm.wfh}
                    wfhMulti={tlModalForm.wfh_multi_day || tlModalForm.wfh}
                    leaveSingle={tlModalForm.leave_single_day}
                    leaveMulti={tlModalForm.leave_multi_day}
                    users={users}
                    onUpdateWfh={(wfh) => setTlModalForm((prev) => ({ ...prev, wfh }))}
                    onUpdateWfhMulti={(wfh_multi_day) =>
                      setTlModalForm((prev) => ({ ...prev, wfh_multi_day }))
                    }
                    onUpdateLeaveSingle={(leaveSingle) =>
                      setTlModalForm((prev) => ({ ...prev, leave_single_day: leaveSingle }))
                    }
                    onUpdateLeaveMulti={(leaveMulti) =>
                      setTlModalForm((prev) => ({ ...prev, leave_multi_day: leaveMulti }))
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
                  disabled={saving}
                  onClick={saveTlRuleModal}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#56348f] text-white hover:bg-[#462875] shadow-md shadow-purple-900/20 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{saving ? "Saving Rule..." : "Save Team Lead Rule"}</span>
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

                {/* The 4 CARDS for Employee Routing */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Routing Cards for Selected Employees
                  </h4>
                  <ThreeCardsEditor
                    wfh={empModalForm.wfh}
                    wfhMulti={empModalForm.wfh_multi_day || empModalForm.wfh}
                    leaveSingle={empModalForm.leave_single_day}
                    leaveMulti={empModalForm.leave_multi_day}
                    users={users}
                    onUpdateWfh={(wfh) => setEmpModalForm((prev) => ({ ...prev, wfh }))}
                    onUpdateWfhMulti={(wfh_multi_day) =>
                      setEmpModalForm((prev) => ({ ...prev, wfh_multi_day }))
                    }
                    onUpdateLeaveSingle={(leaveSingle) =>
                      setEmpModalForm((prev) => ({ ...prev, leave_single_day: leaveSingle }))
                    }
                    onUpdateLeaveMulti={(leaveMulti) =>
                      setEmpModalForm((prev) => ({ ...prev, leave_multi_day: leaveMulti }))
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
                  disabled={saving}
                  onClick={saveEmpRuleModal}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#56348f] text-white hover:bg-[#462875] shadow-md shadow-purple-900/20 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{saving ? "Saving Rule..." : "Save Employee Rule"}</span>
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
