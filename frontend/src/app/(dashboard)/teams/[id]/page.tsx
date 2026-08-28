"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";
import Link from "next/link";
import { ArrowLeft, Users, Search, X, CheckSquare, Square, Filter, UserCheck, UserX } from "lucide-react";
import api from "@/services/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TeamForm from "@/components/teams/TeamForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { toastManager } from "@/components/ui/toast";

export default function EditTeamPage() {
  const params = useParams();
  const router = useRouter();
  const [team, setTeam] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "selected" | "unassigned" | "in_team">("all");

  useEffect(() => {
    fetchTeamAndUsers();
  }, [params.id]);

  const fetchTeamAndUsers = async () => {
    try {
      const [teamRes, employeesRes] = await Promise.all([
        api.get(`/teams/${params.id}`),
        api.get(`/employees?per_page=all`).catch(async () => {
          return api.get(`/employees?per_page=300`);
        }),
      ]);

      const currentTeam = teamRes.data.data;
      setTeam(currentTeam);

      const allEmployees = employeesRes.data.data || [];
      setAllUsers(allEmployees);

      // Pre-select current members
      const currentIds = currentTeam.members?.map((m: any) => m.id) || [];
      setSelectedMemberIds(currentIds);
    } catch (e) {
      console.error(e);
      toastManager.add({
        type: "error",
        title: "Failed to load team data",
        description: "Please check your network and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Eligible users are those unassigned or already in this specific team
  const eligibleUsers = useMemo(() => {
    if (!team) return [];
    return allUsers.filter((user) => !user.team_id || user.team_id === team.id);
  }, [allUsers, team]);

  // Filtered users based on search query and filter tab
  const filteredUsers = useMemo(() => {
    let list = eligibleUsers;

    if (filterMode === "selected") {
      list = list.filter((user) => selectedMemberIds.includes(user.id));
    } else if (filterMode === "unassigned") {
      list = list.filter((user) => !user.team_id);
    } else if (filterMode === "in_team") {
      list = list.filter((user) => user.team_id === team?.id);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((user) => {
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
        const email = (user.email || "").toLowerCase();
        const designation = (user.designation || "").toLowerCase();
        const code = (user.employee_code || "").toLowerCase();
        return (
          fullName.includes(q) ||
          email.includes(q) ||
          designation.includes(q) ||
          code.includes(q)
        );
      });
    }

    return list;
  }, [eligibleUsers, filterMode, searchQuery, selectedMemberIds, team]);

  const toggleMemberSelection = (id: number) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter((m) => m !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredUsers.map((u) => u.id);
    const newSelected = Array.from(new Set([...selectedMemberIds, ...visibleIds]));
    setSelectedMemberIds(newSelected);
  };

  const handleDeselectAllVisible = () => {
    const visibleIdsSet = new Set(filteredUsers.map((u) => u.id));
    setSelectedMemberIds(selectedMemberIds.filter((id) => !visibleIdsSet.has(id)));
  };

  const handleSyncMembers = async () => {
    setMembersLoading(true);
    try {
      await api.post(`/teams/${params.id}/members`, {
        member_ids: selectedMemberIds,
      });
      toastManager.add({
        type: "success",
        title: "Members Updated",
        description: `Successfully assigned ${selectedMemberIds.length} members to ${team.name}.`,
      });
      fetchTeamAndUsers(); // refresh data
    } catch (err: any) {
      toastManager.add({
        type: "error",
        title: "Failed to update members",
        description: err?.response?.data?.message || "An unexpected error occurred.",
      });
    } finally {
      setMembersLoading(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!team) return <div className="p-8 text-center">Team not found.</div>;

  const inTeamCount = eligibleUsers.filter((u) => u.team_id === team.id).length;
  const unassignedCount = eligibleUsers.filter((u) => !u.team_id).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push(`/teams?refresh=${Date.now()}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Manage {team.name}</h1>
          <p className="text-slate-600 dark:text-slate-300">{selectedMemberIds.length} Members Assigned</p>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Team Details</TabsTrigger>
          <TabsTrigger value="members">Team Members ({selectedMemberIds.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <TeamForm initialData={team} isEdit={true} />
        </TabsContent>

        <TabsContent value="members">
          <Card className="max-w-4xl shadow-sm border border-slate-200 dark:border-white/10">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-amber-500" /> Manage Members
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Select unassigned employees or currently assigned members. Employees in other teams are hidden.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {selectedMemberIds.length} Selected
                  </span>
                </div>
              </div>

              {/* ── Search Bar & Filter Tabs ── */}
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search by employee name, email, designation, or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10 rounded-xl text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterMode("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filterMode === "all"
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      All Available ({eligibleUsers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode("selected")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filterMode === "selected"
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      Selected ({selectedMemberIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode("in_team")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filterMode === "in_team"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      In this Department ({inTeamCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode("unassigned")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filterMode === "unassigned"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      Unassigned ({unassignedCount})
                    </button>
                  </div>

                  {filteredUsers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAllVisible}
                        className="h-8 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      >
                        <CheckSquare className="h-3.5 w-3.5 mr-1" /> Select All ({filteredUsers.length})
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleDeselectAllVisible}
                        className="h-8 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      >
                        <Square className="h-3.5 w-3.5 mr-1" /> Deselect All
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="border border-slate-200 dark:border-white/10 rounded-xl max-h-[600px] overflow-y-auto mb-6 bg-slate-50/50 dark:bg-slate-900/30">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No matching employees found</p>
                    <p className="text-xs mt-1 text-slate-400">
                      {searchQuery
                        ? `No employees match "${searchQuery}" in this filter.`
                        : "No employees available in this category."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredUsers.map((user) => {
                      const isSelected = selectedMemberIds.includes(user.id);
                      return (
                        <div
                          key={user.id}
                          onClick={() => toggleMemberSelection(user.id)}
                          className={`group flex items-center gap-3.5 p-3.5 transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-amber-500/10 dark:bg-amber-500/15 hover:bg-amber-500/15"
                              : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            id={`user-${user.id}`}
                            className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                            checked={isSelected}
                            onChange={() => {}} // Handled by container click
                          />
                          <label
                            htmlFor={`user-${user.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-3.5 flex-1 cursor-pointer min-w-0"
                          >
                            <RoyalAvatar
                              src={user.profile_photo_path}
                              name={`${user.first_name} ${user.last_name}`}
                              userId={user.id}
                              className="h-9 w-9 rounded-full shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                                  <RoyalName
                                    name={`${user.first_name} ${user.last_name}`}
                                    userId={user.id}
                                    className="text-slate-900 dark:text-slate-100"
                                  />
                                </span>
                                {user.employee_code && (
                                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                    {user.employee_code}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {user.designation || "No Designation"} • {user.email}
                              </span>
                            </div>
                          </label>
                          <div className="shrink-0 text-xs">
                            {user.team_id === team.id ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                In this department
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredUsers.length}</span> of{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{eligibleUsers.length}</span> eligible employees
                </p>
                <Button
                  onClick={handleSyncMembers}
                  disabled={membersLoading}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6"
                >
                  {membersLoading ? "Saving Changes..." : `Save Assignments (${selectedMemberIds.length} Selected)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
