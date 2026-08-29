"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  Puzzle,
  Bug,
  CalendarCheck,
  ShieldCheck,
  Users,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Plus,
  Settings2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import pmApi from "@/services/pm";
import { PmAddon, PmTeamSummary } from "@/types/pm";

export default function PmAddonsPage() {
  const { user } = useAuthStore();
  const userRoleStr = (user?.role || "").toLowerCase();
  const isSuperAdmin = userRoleStr === "super admin";

  const [addons, setAddons] = useState<PmAddon[]>([]);
  const [teams, setTeams] = useState<PmTeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingAddonId, setSavingAddonId] = useState<number | null>(null);
  const [selectedTeamsMap, setSelectedTeamsMap] = useState<Record<number, number[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchAddonsData = useCallback(async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await pmApi.getAddons();
      setAddons(res.addons || []);
      setTeams(res.teams || []);

      // Initialize team assignment state
      const map: Record<number, number[]> = {};
      (res.addons || []).forEach((a) => {
        map[a.id] = (a.teams || []).map((t) => t.id);
      });
      setSelectedTeamsMap(map);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load add-on features.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAddonsData();
  }, [fetchAddonsData]);

  const handleToggleTeam = (addonId: number, teamId: number) => {
    setSelectedTeamsMap((prev) => {
      const current = prev[addonId] || [];
      const updated = current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : [...current, teamId];
      return { ...prev, [addonId]: updated };
    });
  };

  const handleSaveTeams = async (addonId: number) => {
    setSavingAddonId(addonId);
    setError(null);
    setSuccessMessage(null);

    try {
      const teamIds = selectedTeamsMap[addonId] || [];
      const res = await pmApi.assignAddonTeams(addonId, teamIds);
      setSuccessMessage(res.message || "Teams assigned successfully.");
      // Refresh addon in list
      setAddons((prev) =>
        prev.map((a) => (a.id === addonId ? { ...a, teams: res.addon.teams } : a))
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to assign teams to add-on.");
    } finally {
      setSavingAddonId(null);
    }
  };

  const handleToggleActive = async (addon: PmAddon) => {
    setSavingAddonId(addon.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await pmApi.toggleAddonStatus(addon.id);
      setSuccessMessage(res.message);
      setAddons((prev) =>
        prev.map((a) => (a.id === addon.id ? { ...a, is_active: res.addon.is_active } : a))
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to toggle add-on status.");
    } finally {
      setSavingAddonId(null);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-center space-y-3">
          <ShieldCheck className="w-12 h-12 mx-auto text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-bold">Super Admin Access Only</h2>
          <p className="text-xs">Only Super Administrators can configure and assign project management add-ons.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/project-management" className="hover:text-purple-600 dark:hover:text-purple-400">
              Project Management
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white">Add-on Features</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Puzzle className="w-6 h-6 text-[#56348f]" />
            <span>Project Management Add-ons</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage optional features and assign module capabilities to specific delivery teams
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchAddonsData(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#56348f]" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Notification Banners ── */}
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

      {/* ── Add-on Cards Grid ── */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 space-y-3 animate-pulse">
          <Puzzle className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
          <p className="text-sm font-medium">Loading Add-on modules…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {addons.map((addon) => {
            const assignedTeamIds = selectedTeamsMap[addon.id] || [];
            const isSaving = savingAddonId === addon.id;

            return (
              <div
                key={addon.id}
                className={`rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm p-6 space-y-5 ${
                  addon.is_active
                    ? "border-purple-200/80 dark:border-purple-800/60 ring-1 ring-purple-500/10"
                    : "border-slate-200 dark:border-slate-800 opacity-80"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300 shrink-0">
                      {addon.key === "bug_tracker" ? (
                        <Bug className="w-6 h-6" />
                      ) : addon.key === "leave_policy" ? (
                        <CalendarCheck className="w-6 h-6" />
                      ) : (
                        <Puzzle className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{addon.name}</h2>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            addon.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                          }`}
                        >
                          {addon.is_active ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {addon.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Active Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(addon)}
                    disabled={isSaving}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={addon.is_active ? "Disable Add-on" : "Enable Add-on"}
                  >
                    {addon.is_active ? (
                      <ToggleRight className="w-8 h-8 text-[#56348f] dark:text-purple-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>

                {/* Conditional Body: Leave Policy (Global Module) vs Team Add-on */}
                {addon.key === "leave_policy" ? (
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-300 space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#56348f] dark:text-purple-400" />
                        <span>Company-Wide Policy Engine</span>
                      </div>
                      <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80 leading-relaxed">
                        Applies globally to all company employees with dynamic monthly cycle boundaries, probation logic, and individual allocation overrides.
                      </p>
                    </div>

                    <div className="flex items-center justify-end pt-2">
                      <Link
                        href="/project-management/addons/leave-policy"
                        style={{
                          backgroundColor: "#56348f",
                          color: "rgb(255, 255, 255)",
                          fontFamily: '"Proxima Nova", sans-serif',
                          fontSize: "13px",
                          lineHeight: "20px",
                          fontWeight: 600,
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-[13px] leading-[20px] font-semibold shadow-sm transition-colors cursor-pointer"
                      >
                        <Settings2 className="w-4 h-4 !text-white" />
                        <span className="!text-white">Configure Policy Management</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Team Assignment Selector */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <Users className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
                          <span>Assign To Team(s)</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {assignedTeamIds.length} team{assignedTeamIds.length === 1 ? "" : "s"} selected
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Only members and leads of the selected teams will see this module and its menu items.
                      </p>

                      <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto">
                        {teams.map((team) => {
                          const isAssigned = assignedTeamIds.includes(team.id);

                          return (
                            <button
                              key={team.id}
                              type="button"
                              onClick={() => handleToggleTeam(addon.id, team.id)}
                              style={{
                                backgroundColor: isAssigned ? "#56348f" : undefined,
                                color: isAssigned ? "rgb(255, 255, 255)" : undefined,
                                fontFamily: '"Proxima Nova", sans-serif',
                                fontSize: "12px",
                                fontWeight: 400,
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-normal border transition-all cursor-pointer ${
                                isAssigned
                                  ? "bg-[#56348f] !text-white border-[#56348f] shadow-2xs"
                                  : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700"
                              }`}
                            >
                              <span className={isAssigned ? "!text-white" : ""}>{team.name}</span>
                              {isAssigned && <Check className="w-3.5 h-3.5 !text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Save Changes Footer */}
                    <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleSaveTeams(addon.id)}
                        disabled={isSaving}
                        style={{ backgroundColor: "#56348f", color: "rgb(255, 255, 255)", fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-[13px] leading-[20px] font-normal shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin !text-white" />
                            <span className="!text-white">Saving Teams…</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 !text-white" />
                            <span className="!text-white">Save Assigned Teams</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
