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
  ShieldCheck,
  Eye,
  FilePlus,
  Code,
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
  Bug,
} from "lucide-react";

export default function BugSmartPermissionsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [definitions, setDefinitions] = useState<PermissionDefinition[]>([]);
  const [teams, setTeams] = useState<PermissionTeam[]>([]);
  const [matrix, setMatrix] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== "Super Admin") {
      router.replace("/project-management/bugzilla");
    }
  }, [user, router]);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await teamPermissionsApi.getMatrix();
      // Filter STRICTLY to bugSmart permissions only
      const allDefs = res.definitions || [];
      const bugSmartDefs = allDefs.filter(
        (d: any) =>
          d.category === "bugSmart Defect Management" ||
          d.category === "Bugzilla Defect Management" ||
          d.key.startsWith("bugzilla")
      );
      setDefinitions(bugSmartDefs);
      setTeams(res.teams || []);
      setMatrix(res.matrix || {});
    } catch (err: any) {
      console.error("Failed to load bugSmart permissions:", err);
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

  // Bulk assign all teams for a permission
  const handleBulkScope = (permissionKey: string, scope: PermissionScope) => {
    setMatrix((prev) => {
      const newObj: Record<number, "leads_only" | "all_members"> = {};
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
      setSuccessMessage(res.message || "bugSmart permissions updated successfully.");
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

  // Filter definitions by search term
  const filteredDefinitions = useMemo(() => {
    return definitions.filter((def) => {
      if (!search) return true;
      return (
        def.name.toLowerCase().includes(search.toLowerCase()) ||
        def.description.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [definitions, search]);

  const getPermissionIcon = (key: string) => {
    if (key.includes("viewer")) {
      return <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
    if (key.includes("reporter")) {
      return <FilePlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
    return <Code className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              bugSmart Team Permissions
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
              Scraped to bugSmart Only
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Granularly configure which departmental teams can view, report, or develop defects inside bugSmart.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing || saving}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || refreshing}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 shadow-md shadow-rose-500/20 transition-all disabled:opacity-60"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Permissions
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Alerts ── */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-300 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between gap-3 text-rose-800 dark:text-rose-300 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Search Bar ── */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter bugSmart capabilities..."
          className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
        />
      </div>

      {/* ── Permission Cards ── */}
      <div className="space-y-6">
        {filteredDefinitions.map((def) => {
          const permMatrix = matrix[def.key] || {};
          const assignedCount = Object.keys(permMatrix).length;

          return (
            <div
              key={def.key}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
                    {getPermissionIcon(def.key)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {def.name}
                      </h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {assignedCount} / {teams.length} teams assigned
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-3xl">
                      {def.description}
                    </p>
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                  <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">
                    Bulk:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBulkScope(def.key, null)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkScope(def.key, "leads_only")}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 transition-colors flex items-center gap-1"
                  >
                    <Crown className="w-3 h-3" />
                    All Leads
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkScope(def.key, "all_members")}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 transition-colors flex items-center gap-1"
                  >
                    <Users className="w-3 h-3" />
                    All Members
                  </button>
                </div>
              </div>

              {/* Teams Grid */}
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {teams.map((t) => {
                  const scope = permMatrix[t.id] || null;

                  return (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        scope
                          ? "bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-800/60 shadow-2xs"
                          : "bg-slate-50/40 dark:bg-slate-800/20 border-slate-200/70 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {t.name}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                            Lead:{" "}
                            {t.team_lead
                              ? `${t.team_lead.first_name} ${t.team_lead.last_name}`
                              : "None assigned"}
                          </p>
                        </div>
                        {scope && (
                          <div className="w-2 h-2 rounded-full bg-rose-500 shadow-xs shrink-0" />
                        )}
                      </div>

                      {/* 3-State Scope Selector */}
                      <div className="grid grid-cols-3 gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => handleSetScope(def.key, t.id, null)}
                          className={`py-1 rounded text-center transition-all ${
                            !scope
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs"
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          }`}
                        >
                          Off
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetScope(def.key, t.id, "leads_only")}
                          className={`py-1 rounded text-center transition-all flex items-center justify-center gap-0.5 ${
                            scope === "leads_only"
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 shadow-2xs border border-amber-300 dark:border-amber-700"
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          }`}
                        >
                          <Crown className="w-2.5 h-2.5" />
                          Leads
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetScope(def.key, t.id, "all_members")}
                          className={`py-1 rounded text-center transition-all flex items-center justify-center gap-0.5 ${
                            scope === "all_members"
                              ? "bg-rose-600 text-white shadow-2xs"
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          }`}
                        >
                          <Users className="w-2.5 h-2.5" />
                          All
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
    </div>
  );
}
