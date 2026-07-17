"use client";

import { useEffect, useState } from "react";
import { Building2, Users, ChevronDown, ChevronRight } from "lucide-react";
import api from "@/services/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Team {
  id: number;
  name: string;
  code: string;
  team_lead?: {
    id: number;
    first_name: string;
    last_name: string;
    profile_photo_path?: string;
    designation?: string;
  };
  members_count?: number;
  members?: any[];
}

interface TeamNode {
  team: Team;
  isExpanded: boolean;
}

export function TeamHierarchyChart() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/teams");
      setTeams(response.data.data || []);
    } catch (e) {
      console.error("Failed to fetch teams:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTeam = (teamId: number) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-slate-500 dark:text-slate-400">
        Loading team hierarchy...
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 dark:text-slate-400">
        No teams to display
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="h-6 w-6 text-amber-400" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Department Hierarchy
        </h2>
      </div>

      <div className="space-y-3">
        {teams.map((team) => (
          <div key={team.id} className="space-y-2">
            {/* Team Card */}
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Team Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {team.name}
                      </h3>
                      <span className="px-2 py-1 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-mono rounded">
                        {team.code}
                      </span>
                    </div>

                    {/* Team Lead */}
                    {team.team_lead ? (
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6 border border-amber-400/30">
                          <AvatarImage
                            src={team.team_lead.profile_photo_path}
                            alt={team.team_lead.first_name}
                          />
                          <AvatarFallback className="text-xs">
                            {team.team_lead.first_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {team.team_lead.first_name} {team.team_lead.last_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {team.team_lead.designation || "Team Lead"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400 dark:text-slate-500 mb-2">
                        No team lead assigned
                      </div>
                    )}
                  </div>

                  {/* Member Count */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-white/5 rounded-lg text-sm">
                    <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {team.members_count || 0}
                    </span>
                  </div>
                </div>

                {/* Expand/Collapse Button */}
                {team.members_count && team.members_count > 0 && (
                  <button
                    onClick={() => toggleTeam(team.id)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors ml-2"
                  >
                    {expandedTeams[team.id] ? (
                      <ChevronDown className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Team Members (Expanded) */}
            {expandedTeams[team.id] && team.members && team.members.length > 0 && (
              <div className="ml-6 pl-4 border-l-2 border-amber-400/30 space-y-2">
                {team.members.map((member, index) => (
                  <div
                    key={member.id}
                    className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-white/10 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {index === 0 && (
                          <div className="w-6 h-6 rounded-full bg-amber-400/20 border border-amber-400 flex items-center justify-center">
                            <span className="text-xs font-bold text-amber-600">★</span>
                          </div>
                        )}
                        {index !== 0 && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={member.profile_photo_path}
                              alt={member.first_name}
                            />
                            <AvatarFallback className="text-xs">
                              {member.first_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {member.designation || "Employee"}
                        </p>
                      </div>

                      {index === 0 && (
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded">
                          Team Lead
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-200 dark:border-white/10">
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-white/10">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
            Total Departments
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {teams.length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-white/10">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
            Team Leads
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {teams.filter((t) => t.team_lead).length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-white/10">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
            Total Members
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {teams.reduce((sum, t) => sum + (t.members_count || 0), 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-white/10">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
            Avg Team Size
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {teams.length > 0
              ? Math.round(
                  teams.reduce((sum, t) => sum + (t.members_count || 0), 0) /
                    teams.length
                )
              : 0}
          </p>
        </div>
      </div>
    </div>
  );
}
