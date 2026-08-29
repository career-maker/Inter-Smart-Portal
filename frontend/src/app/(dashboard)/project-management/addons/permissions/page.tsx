"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuthStore } from "@/store/auth";
import teamPermissionsApi, {
  PermissionDefinition,
  PermissionTeam,
  PermissionMatrix,
  PermissionScope,
} from "@/services/teamPermissions";
import {
  Shield,
  Layers,
  UserPlus,
  Bug,
  CalendarCheck,
  Clock,
  Check,
  X,
  Search,
  RefreshCw,
  Save,
  Crown,
  Users,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Info,
} from "lucide-react";

export default function PermissionsManagementPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [definitions, setDefinitions] = useState<PermissionDefinition[]>([]);
  const [teams, setTeams] = useState<PermissionTeam[]>([]);
  const [matrix, setMatrix] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const res = await teamPermissionsApi.getMatrix();
      setDefinitions(res.definitions || []);
      setTeams(res.teams || []);
      setMatrix(res.matrix || {});
    } catch (err: any) {
      console.error("Failed to load permissions:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load permission matrix."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle a team's scope for a given permission
  const handleSetScope = (
    permissionKey: string,
    teamId: number,
    scope: PermissionScope
  ) => {
    setMatrix((prev) => {
      const currentPermObj = { ...(prev[permissionKey] || {}) };
      if (!scope) {
        delete currentPermObj[teamId];
      } else {
        currentPermObj[teamId] = scope;
      }

      return {
        ...prev,
        [permissionKey]: currentPermObj,
      };
    });
  };

  // Bulk set all teams for a permission
  const handleBulkSetPermission = (
    permissionKey: string,
    scope: PermissionScope
  ) => {
    setMatrix((prev) => {
      const newObj: { [teamId: number]: PermissionScope } = {};
      if (scope) {
        teams.forEach((t) => {
          newObj[t.id] = scope;
        });
      }

      return {
        ...prev,
        [permissionKey]: newObj,
      };
    });
  };

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await teamPermissionsApi.updateMatrix(matrix);
      setSuccessMessage(res.message || "Permissions updated successfully.");
      await fetchData(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save permissions."
      );
    } finally {
      setSaving(false);
    }
  };

  // Filter definitions
  const filteredDefinitions = useMemo(() => {
    return definitions.filter((def) => {
      const matchesSearch =
        !search ||
        def.name.toLowerCase().includes(search.toLowerCase()) ||
        def.description.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory !== "all" && def.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [definitions, search, selectedCategory]);

  const categories = useMemo(() => {
    const set = new Set(definitions.map((d) => d.category));
    return ["all", ...Array.from(set)];
  }, [definitions]);

  const getPermissionIcon = (iconName: string) => {
    switch (iconName) {
      case "Layers":
        return <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case "UserPlus":
        return <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "Bug":
        return <Bug className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      case "CalendarCheck":
        return <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case "Clock":
        return <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      default:
        return <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div
      style={{
        fontFamily:
          '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-16"
    >
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Link
              href="/project-management/addons"
              className="hover:text-purple-600 dark:hover:text-purple-400"
            >
              Add-ons
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white">
              Team & Role Permissions
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-[#56348f] dark:text-purple-400" />
            <span>Team & Role Permissions Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Assign cross-team data visibility, task switcher access, and team-lead-only privileges to specific delivery teams.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing || saving}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                refreshing ? "animate-spin text-[#56348f]" : ""
              }`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              backgroundColor: "#56348f",
              color: "rgb(255, 255, 255)",
              fontFamily: '"Proxima Nova", sans-serif',
              fontSize: "12px",
              fontWeight: 600,
            }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin !text-white" />
            ) : (
              <Save className="w-4 h-4 !text-white" />
            )}
            <span className="!text-white">Save All Permissions</span>
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
          <button
            onClick={() => setSuccessMessage(null)}
            className="underline cursor-pointer"
          >
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

      {/* ── Informational Legend Banner ── */}
      <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 text-xs text-purple-950 dark:text-purple-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#56348f] dark:text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">How Permission Scoping Works:</span>
            <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80">
              Super Admins have universal access to all modules. Assigning permissions here extends cross-team capabilities to delivery teams or specifically to their designated Team Leads.
            </p>
          </div>
        </div>

        {/* Legend Pills */}
        <div className="flex items-center gap-2 text-[11px] shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-500">
            ⚪ Off (No Access)
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 text-amber-800 dark:text-amber-300 font-bold">
            <Crown className="w-3 h-3 text-amber-500" /> Leads Only
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#56348f] text-white font-bold shadow-2xs">
            <Users className="w-3 h-3 text-white" /> All Members
          </span>
        </div>
      </div>

      {/* ── Search and Category Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search permissions by name or keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 outline-none"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer capitalize ${
                selectedCategory === cat
                  ? "bg-[#56348f] text-white border-[#56348f]"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-purple-300"
              }`}
            >
              {cat === "all" ? `All Capabilities (${definitions.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Permissions Matrix Grid ── */}
      <div className="space-y-6">
        {filteredDefinitions.map((def) => {
          const currentAssignments = matrix[def.key] || {};
          const activeTeamCount = Object.keys(currentAssignments).length;

          return (
            <div
              key={def.key}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
            >
              {/* Permission Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
                    {getPermissionIcon(def.icon)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {def.name}
                      </h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-[#56348f] dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {def.category}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        ({activeTeamCount} / {teams.length} teams assigned)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
                      {def.description}
                    </p>
                  </div>
                </div>

                {/* Bulk Quick Actions */}
                <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                  <span className="text-[11px] text-slate-400 font-semibold mr-1">
                    Bulk:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBulkSetPermission(def.key, null)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkSetPermission(def.key, "leads_only")}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition cursor-pointer flex items-center gap-1"
                  >
                    <Crown className="w-3 h-3 text-amber-500" />
                    All Leads
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkSetPermission(def.key, "all_members")}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/50 border border-purple-200 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition cursor-pointer flex items-center gap-1"
                  >
                    <Users className="w-3 h-3 text-purple-500" />
                    All Members
                  </button>
                </div>
              </div>

              {/* Team Assignment Selectors Grid */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {teams.map((team) => {
                  const currentScope = currentAssignments[team.id] || null;

                  return (
                    <div
                      key={team.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        currentScope === "all_members"
                          ? "bg-purple-50/40 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800 shadow-2xs"
                          : currentScope === "leads_only"
                          ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 shadow-2xs"
                          : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {/* Team Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {team.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            Lead:{" "}
                            {team.team_lead
                              ? `${team.team_lead.first_name} ${team.team_lead.last_name}`
                              : "Not assigned"}
                          </p>
                        </div>

                        {/* Status Icon */}
                        {currentScope === "all_members" ? (
                          <span className="p-1 rounded-full bg-[#56348f] text-white shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </span>
                        ) : currentScope === "leads_only" ? (
                          <span className="p-1 rounded-full bg-amber-500 text-white shrink-0">
                            <Crown className="w-3 h-3 text-white" />
                          </span>
                        ) : null}
                      </div>

                      {/* 3-State Scope Selector */}
                      <div className="grid grid-cols-3 gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => handleSetScope(def.key, team.id, null)}
                          className={`py-1 rounded text-center transition cursor-pointer ${
                            currentScope === null
                              ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold"
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Off
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSetScope(def.key, team.id, "leads_only")
                          }
                          className={`py-1 rounded text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                            currentScope === "leads_only"
                              ? "bg-amber-500 text-white font-bold shadow-2xs"
                              : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                          }`}
                          title="Apply only to Team Leads of this department"
                        >
                          <Crown className="w-3 h-3" />
                          <span>Leads</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSetScope(def.key, team.id, "all_members")
                          }
                          className={`py-1 rounded text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                            currentScope === "all_members"
                              ? "bg-[#56348f] text-white font-bold shadow-2xs"
                              : "text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                          }`}
                          title="Apply to all team members and leads"
                        >
                          <Users className="w-3 h-3" />
                          <span>All</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Sticky Bottom Save Bar ── */}
      <div className="sticky bottom-4 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl">
        <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#56348f] dark:text-purple-400 shrink-0" />
          <span className="font-medium">
            Changes take effect immediately across all active user sessions upon saving.
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: "#56348f",
            color: "rgb(255, 255, 255)",
            fontFamily: '"Proxima Nova", sans-serif',
            fontSize: "13px",
            fontWeight: 600,
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer shrink-0"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin !text-white" />
          ) : (
            <Save className="w-4 h-4 !text-white" />
          )}
          <span className="!text-white">Save All Permissions</span>
        </button>
      </div>
    </div>
  );
}
