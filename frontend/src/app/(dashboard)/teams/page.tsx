"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, MoreHorizontal, FileEdit, Trash2, Users, Network } from "lucide-react";
import api from "@/services/api";
import { TeamHierarchyChart } from "@/components/teams/TeamHierarchyChart";
import { FavoriteButton } from "@/components/layout/FavoriteButton";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [membersByTeam, setMembersByTeam] = useState<Record<number, any[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<Record<number, boolean>>({});
  const [hoveredTeamId, setHoveredTeamId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "hierarchy">("grid");

  useEffect(() => {
    fetchTeams();
  }, [search]);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/teams?search=${search}`);
      setTeams(response.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this team? Members will be unassigned.")) {
      try {
        await api.delete(`/teams/${id}`);
        fetchTeams();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const fetchTeamMembers = async (teamId: number) => {
    if (membersByTeam[teamId]) {
      return; // Already loaded
    }

    setLoadingMembers((prev) => ({ ...prev, [teamId]: true }));
    try {
      const response = await api.get(`/teams/${teamId}`);
      setMembersByTeam((prev) => ({
        ...prev,
        [teamId]: response.data.data.members || [],
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMembers((prev) => ({ ...prev, [teamId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-amber-400" />
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Departments</h1>
        </div>
        <div className="flex items-center gap-2">
          <FavoriteButton label="Departments" />
          <div className="flex gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-amber-500 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="h-4 w-4 inline mr-1" />
              Grid
            </button>
            <button
              onClick={() => setViewMode("hierarchy")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === "hierarchy"
                  ? "bg-amber-500 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Network className="h-4 w-4 inline mr-1" />
              Hierarchy
            </button>
          </div>
          <Button onClick={() => router.push("/teams/create")}>
            <Plus className="mr-2 h-4 w-4" /> Create Department
          </Button>
        </div>
      </div>

      {viewMode === "grid" && (
        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-white/10">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
            <Input
              type="search"
              placeholder="Search departments..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {viewMode === "hierarchy" ? (
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-6">
          <TeamHierarchyChart />
        </div>
      ) : isLoading ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">Loading departments...</div>
      ) : teams.length === 0 ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg shadow-sm">No departments found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card key={team.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-xl">{team.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[40px] mt-2">
                    {team.description || "No description provided."}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 focus-visible:outline-none">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/teams/${team.id}`)}>
                      <FileEdit className="mr-2 h-4 w-4" /> Manage Team
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(team.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 border">
                        {team.team_lead ? (
                          <>
                            <AvatarImage src={team.team_lead.profile_photo_path} alt={team.team_lead.first_name} />
                            <AvatarFallback>{team.team_lead.first_name?.charAt(0)}</AvatarFallback>
                          </>
                        ) : (
                          <AvatarFallback>?</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium leading-none">
                          {team.team_lead ? `${team.team_lead.first_name} ${team.team_lead.last_name}` : 'No Lead'}
                        </span>
                        <span className="text-xs text-muted-foreground">Team Lead</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-transparent border-t px-6 py-3 relative">
                <div
                  className="flex items-center text-sm text-muted-foreground hover:text-slate-900 transition-colors cursor-pointer"
                  onMouseEnter={() => {
                    setHoveredTeamId(team.id);
                    fetchTeamMembers(team.id);
                  }}
                  onMouseLeave={() => setHoveredTeamId(null)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {team.members_count} Members
                </div>

                {hoveredTeamId === team.id && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-50">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-slate-900">Team Members</h4>
                      {loadingMembers[team.id] ? (
                        <p className="text-xs text-slate-500">Loading members...</p>
                      ) : membersByTeam[team.id]?.length === 0 ? (
                        <p className="text-xs text-slate-500">No members in this team</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {membersByTeam[team.id]?.map((member: any) => (
                            <div key={member.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-100">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={member.profile_photo_path} alt={member.first_name} />
                                <AvatarFallback className="text-xs">
                                  {member.first_name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-sm font-medium text-slate-900 truncate">
                                  {member.first_name} {member.last_name}
                                </span>
                                <span className="text-xs text-slate-500 truncate">
                                  {member.designation || "No designation"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
