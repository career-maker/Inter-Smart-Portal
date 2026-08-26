"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Loader2,
  RefreshCw,
  Link2,
  Unlink,
  Check,
  Search,
  AlertCircle,
  Users,
  Building2,
  Save,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import api from "@/services/api";
import pmApi from "@/services/pm";

interface HubstaffMemberItem {
  hubstaff_user_id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  membership_role?: string;
  linked_user?: {
    id: number;
    first_name: string;
    last_name: string;
    email?: string;
    employee_code?: string;
    designation?: string;
  } | null;
}

interface HREmployeeItem {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  employee_code?: string;
  department?: string;
}

interface SyncHubstaffUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SyncHubstaffUsersModal({ isOpen, onClose }: SyncHubstaffUsersModalProps) {
  const [loading, setLoading] = useState(true);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [hubstaffUsers, setHubstaffUsers] = useState<HubstaffMemberItem[]>([]);
  const [hrEmployees, setHrEmployees] = useState<HREmployeeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Map of hubstaff_user_id -> selected hr_user_id (number | null)
  const [selectedLinks, setSelectedLinks] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const [hsRes, empsRes] = await Promise.allSettled([
          pmApi.getHubstaffUsers(),
          api.get("/employees?per_page=all"),
        ]);

        let hsList: HubstaffMemberItem[] = [];
        if (hsRes.status === "fulfilled") {
          hsList = hsRes.value.users || [];
          setHubstaffUsers(hsList);
        } else {
          console.warn("Hubstaff users load failed", hsRes.reason);
        }

        let empList: HREmployeeItem[] = [];
        if (empsRes.status === "fulfilled") {
          const raw = empsRes.value.data?.data?.data || empsRes.value.data?.data || [];
          if (Array.isArray(raw)) {
            empList = raw.map((e: any) => ({
              id: e.id,
              first_name: e.first_name,
              last_name: e.last_name,
              email: e.email,
              employee_code: e.employee_code,
              department: e.team?.name || e.department || "General",
            }));
            setHrEmployees(empList);
          }
        }

        // Initialize selectedLinks mapping
        const initialMap: Record<string, number | null> = {};
        hsList.forEach((u) => {
          initialMap[u.hubstaff_user_id] = u.linked_user?.id || null;
        });
        setSelectedLinks(initialMap);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to load Hubstaff users.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen]);

  // Auto-Match Hubstaff Names & Emails to HR Employees
  const handleAutoMatch = () => {
    let matchedCount = 0;
    const newMap = { ...selectedLinks };

    hubstaffUsers.forEach((hs) => {
      if (newMap[hs.hubstaff_user_id]) return; // already linked

      const hsName = hs.name.toLowerCase().trim();
      const hsEmail = (hs.email || "").toLowerCase().trim();

      const matched = hrEmployees.find((emp) => {
        const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase().trim();
        const empEmail = (emp.email || "").toLowerCase().trim();

        if (hsEmail && empEmail && hsEmail === empEmail) return true;
        if (fullName === hsName) return true;
        if (hsName.includes(emp.first_name.toLowerCase()) && hsName.includes(emp.last_name.toLowerCase())) {
          return true;
        }
        return false;
      });

      if (matched) {
        newMap[hs.hubstaff_user_id] = matched.id;
        matchedCount++;
      }
    });

    setSelectedLinks(newMap);
    setSuccessMessage(`Auto-matched ${matchedCount} employee(s). Click "Save All Links" to persist.`);
  };

  const handleLinkSelect = (hubstaffUserId: string, userIdStr: string) => {
    const userId = userIdStr ? Number(userIdStr) : null;
    setSelectedLinks((prev) => ({ ...prev, [hubstaffUserId]: userId }));
  };

  const handleSaveSingle = async (hubstaffUserId: string) => {
    setSavingRowId(hubstaffUserId);
    setError(null);
    setSuccessMessage(null);

    const targetUserId = selectedLinks[hubstaffUserId] ?? null;

    try {
      const res = await pmApi.linkHubstaffUser(hubstaffUserId, targetUserId);
      setSuccessMessage(res.message || "Link updated successfully.");

      // Update local state
      setHubstaffUsers((prev) =>
        prev.map((u) => {
          if (u.hubstaff_user_id === hubstaffUserId) {
            const linkedEmp = hrEmployees.find((e) => e.id === targetUserId);
            return {
              ...u,
              linked_user: linkedEmp
                ? {
                    id: linkedEmp.id,
                    first_name: linkedEmp.first_name,
                    last_name: linkedEmp.last_name,
                    email: linkedEmp.email,
                    employee_code: linkedEmp.employee_code,
                  }
                : null,
            };
          }
          return u;
        })
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update link.");
    } finally {
      setSavingRowId(null);
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    setError(null);
    setSuccessMessage(null);

    const mappings = Object.entries(selectedLinks).map(([hsId, uId]) => ({
      hubstaff_user_id: hsId,
      user_id: uId,
    }));

    try {
      const res = await pmApi.syncHubstaffUsers(mappings);
      setSuccessMessage(res.message || "All mappings synced successfully.");

      // Refresh list
      const hsRes = await pmApi.getHubstaffUsers();
      if (hsRes.users) {
        setHubstaffUsers(hsRes.users);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to sync all mappings.");
    } finally {
      setSavingAll(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return hubstaffUsers;
    const q = searchQuery.toLowerCase();
    return hubstaffUsers.filter((u) => {
      const nameMatch = u.name.toLowerCase().includes(q);
      const emailMatch = (u.email || "").toLowerCase().includes(q);
      const idMatch = u.hubstaff_user_id.includes(q);
      return nameMatch || emailMatch || idMatch;
    });
  }, [hubstaffUsers, searchQuery]);

  const linkedCount = Object.values(selectedLinks).filter(Boolean).length;
  const totalCount = hubstaffUsers.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Sync Employees with Hubstaff
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Link Hubstaff accounts with HR Portal employee profiles to unify identity
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banners */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Top Control Bar */}
        <div className="px-6 pt-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Hubstaff user by name/email..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Action Stats & Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span className="text-blue-600 dark:text-blue-400">{linkedCount}</span> / {totalCount} Linked
            </div>

            <button
              type="button"
              onClick={handleAutoMatch}
              disabled={loading || savingAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
              title="Automatically match employees by full name or email address"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Auto-Match</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={loading || savingAll}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {savingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{savingAll ? "Saving…" : "Save All Links"}</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="p-6 pt-2 overflow-y-auto flex-1">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] sm:text-[11px]">
                  <th className="py-3 px-4 min-w-[220px]">HUBSTAFF USER</th>
                  <th className="py-3 px-4 min-w-[280px]">LINKED HR PORTAL EMPLOYEE</th>
                  <th className="py-3 px-4 min-w-[100px]">STATUS</th>
                  <th className="py-3 px-4 text-right min-w-[90px]">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
                      <span>Loading Hubstaff members and HR employee records…</span>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        No Hubstaff users found
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((hsUser) => {
                    const currentSelectedId = selectedLinks[hsUser.hubstaff_user_id] ?? null;
                    const isLinked = currentSelectedId !== null;
                    const isSavingThis = savingRowId === hsUser.hubstaff_user_id;

                    return (
                      <tr
                        key={hsUser.hubstaff_user_id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Column 1: Hubstaff User Info */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {hsUser.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {hsUser.email && <span>{hsUser.email}</span>}
                            <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                              ID: {hsUser.hubstaff_user_id}
                            </span>
                          </div>
                        </td>

                        {/* Column 2: Search & Link HR Employee */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={currentSelectedId || ""}
                              onChange={(e) =>
                                handleLinkSelect(hsUser.hubstaff_user_id, e.target.value)
                              }
                              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                            >
                              <option value="">-- Unlinked (No HR Employee) --</option>
                              {hrEmployees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.first_name} {emp.last_name}{" "}
                                  {emp.employee_code ? `(${emp.employee_code})` : ""}{" "}
                                  {emp.department ? `• ${emp.department}` : ""}
                                </option>
                              ))}
                            </select>

                            {currentSelectedId && (
                              <button
                                type="button"
                                onClick={() => handleLinkSelect(hsUser.hubstaff_user_id, "")}
                                className="p-1.5 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Unlink"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Column 3: Status Badge */}
                        <td className="py-3 px-4">
                          {isLinked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <Check className="w-3 h-3" />
                              <span>Linked</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <span>Unlinked</span>
                            </span>
                          )}
                        </td>

                        {/* Column 4: Action */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleSaveSingle(hsUser.hubstaff_user_id)}
                            disabled={isSavingThis || savingAll}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isSavingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <span>Save</span>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
          <span>
            Linked employees will be automatically unified when processing Hubstaff tracking, task allocations, and activities.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
