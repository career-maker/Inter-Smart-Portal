"use client";

import { Building2, Layers, Users } from "lucide-react";

interface TeamItem {
  id: number;
  name: string;
}

interface PMDepartmentSwitcherProps {
  teams: TeamItem[];
  selectedTeamId: number | null;
  onSelectTeam: (teamId: number | null) => void;
  loading?: boolean;
}

export function PMDepartmentSwitcher({
  teams,
  selectedTeamId,
  onSelectTeam,
  loading = false,
}: PMDepartmentSwitcherProps) {
  return (
    <div className="rounded-2xl bg-slate-900/60 dark:bg-slate-950/80 border border-slate-800/80 p-3 shadow-lg">
      <div className="flex items-center justify-between gap-3 mb-2 px-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Building2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Department Overview Selector</span>
        </div>
        <span className="text-[11px] text-slate-500">
          Switch view to monitor department-specific KPIs and tasks
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
        {/* All Departments button */}
        <button
          type="button"
          onClick={() => onSelectTeam(null)}
          className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
            selectedTeamId === null
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
              : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Departments</span>
        </button>

        {/* Individual Departments */}
        {teams.map((team) => {
          const isSelected = selectedTeamId === team.id;
          return (
            <button
              type="button"
              key={team.id}
              onClick={() => onSelectTeam(team.id)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                isSelected
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{team.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
