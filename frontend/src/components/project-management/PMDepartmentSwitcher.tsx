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
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 p-4 shadow-sm transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 px-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          <Building2 className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
          <span>Department Overview Selector</span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Switch view to monitor department-specific KPIs and tasks
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
        {/* All Departments button */}
        <button
          type="button"
          onClick={() => onSelectTeam(null)}
          className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer ${
            selectedTeamId === null
              ? "bg-[#56348f] text-white shadow-sm scale-[1.02]"
              : "bg-slate-50 dark:bg-slate-900/60 hover:bg-purple-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
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
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-[#56348f] text-white shadow-sm scale-[1.02]"
                  : "bg-slate-50 dark:bg-slate-900/60 hover:bg-purple-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
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
