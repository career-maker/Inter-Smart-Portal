"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Users, Network, GripVertical } from "lucide-react";
import api from "@/services/api";
import { TeamHierarchyChart } from "@/components/teams/TeamHierarchyChart";
import { TeamCard } from "@/components/teams/TeamCard";
import { FavoriteButton } from "@/components/layout/FavoriteButton";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "hierarchy">("grid");
  const [draggedTeamId, setDraggedTeamId] = useState<number | null>(null);
  const [dragOverTeamId, setDragOverTeamId] = useState<number | null>(null);

  useEffect(() => {
    fetchTeams();
  }, [search]);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/teams?search=${search}`);
      const teamsData = response.data.data || [];

      // Fetch members for each team and calculate performance metrics
      const teamsWithMembers = await Promise.all(
        teamsData.map(async (team: any) => {
          try {
            const teamDetail = await api.get(`/teams/${team.id}`);
            const members = teamDetail.data.data?.members || [];

            // Calculate performance metrics
            let performanceMetrics = {
              attendance_rate: 0,
              approval_speed: 0,
              leave_balance_health: 0,
            };

            // This is placeholder logic - you can enhance with actual calculations
            if (members.length > 0) {
              performanceMetrics.attendance_rate = 92 + Math.floor(Math.random() * 8);
              performanceMetrics.approval_speed = 18 + Math.floor(Math.random() * 12);
              performanceMetrics.leave_balance_health = 75 + Math.floor(Math.random() * 25);
            }

            return {
              ...team,
              members,
              performance_metrics: performanceMetrics,
            };
          } catch (e) {
            return { ...team, members: [], performance_metrics: {} };
          }
        })
      );

      setTeams(teamsWithMembers);
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
        alert("Failed to delete team");
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, teamId: number) => {
    setDraggedTeamId(teamId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetTeamId: number) => {
    e.preventDefault();
    if (!draggedTeamId || draggedTeamId === targetTeamId) {
      setDraggedTeamId(null);
      return;
    }

    // Reorder teams locally
    const draggedIndex = teams.findIndex((t) => t.id === draggedTeamId);
    const targetIndex = teams.findIndex((t) => t.id === targetTeamId);

    if (draggedIndex > -1 && targetIndex > -1) {
      const newTeams = [...teams];
      const [draggedTeam] = newTeams.splice(draggedIndex, 1);
      newTeams.splice(targetIndex, 0, draggedTeam);
      setTeams(newTeams);

      // Optionally send to backend to persist the order
      // await api.post(`/teams/reorder`, { order: newTeams.map((t) => t.id) });
    }

    setDraggedTeamId(null);
    setDragOverTeamId(null);
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
            <TeamCard
              key={team.id}
              team={team}
              onEdit={(teamId) => router.push(`/teams/${teamId}`)}
              onDelete={handleDelete}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragging={draggedTeamId === team.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
