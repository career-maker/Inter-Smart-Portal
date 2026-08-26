"use client";

import { Layers, PlayCircle, Cloud, CheckCircle2, XCircle } from "lucide-react";

export interface DashboardStatsMetrics {
  totalProjects: number;
  activeTasks: number;
  myActiveTasks?: number;
  forecastTasks: number;
  myForecastTasks?: number;
  completedTasks: number;
  myCompletedTasks?: number;
  overdueTasks: number;
  myOverdueTasks?: number;
}

interface PMDashboardStatsProps {
  metrics: DashboardStatsMetrics;
  userRole?: string;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  loading?: boolean;
}

export function PMDashboardStats({
  metrics,
  userRole,
  activeFilter,
  onFilterChange,
  loading = false,
}: PMDashboardStatsProps) {
  const isEmployee = userRole === "Employee" || userRole === "Member" || (!userRole?.includes("Super Admin") && !userRole?.includes("Team Lead"));
  const isTeamLead = userRole === "Team Lead";

  // Card configurations matching QA Tracker Pro aesthetics & precise requirements
  const cards = [
    {
      id: "all_projects",
      title: "Total Projects",
      filter: "All",
      icon: Layers,
      primaryValue: metrics.totalProjects,
      secondaryText: isTeamLead ? "Team projects" : isEmployee ? "Assigned projects" : "Visible projects",
      accentBg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      topBar: "from-blue-500 to-indigo-600",
    },
    {
      id: "active",
      title: "Active Tasks",
      filter: "active",
      icon: PlayCircle,
      // For Employee: only show their active tasks. For Team Lead: show Team total + my tasks. For Super Admin: department total
      primaryValue: isEmployee ? (metrics.myActiveTasks ?? metrics.activeTasks) : metrics.activeTasks,
      subBadge: isTeamLead && metrics.myActiveTasks !== undefined ? `My: ${metrics.myActiveTasks}` : undefined,
      secondaryText: isEmployee ? "My active tasks" : isTeamLead ? "Team total tasks" : "Department active tasks",
      accentBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      topBar: "from-emerald-500 to-green-600",
    },
    {
      id: "forecast",
      title: "Forecast",
      filter: "Forecast",
      icon: Cloud,
      primaryValue: isEmployee ? (metrics.myForecastTasks ?? metrics.forecastTasks) : metrics.forecastTasks,
      subBadge: isTeamLead && metrics.myForecastTasks !== undefined ? `My: ${metrics.myForecastTasks}` : undefined,
      secondaryText: isEmployee ? "My forecast tasks" : isTeamLead ? "Team forecast" : "Upcoming deliverables",
      accentBg: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      topBar: "from-purple-500 to-fuchsia-600",
    },
    {
      id: "completed",
      title: "Completed",
      filter: "Completed",
      icon: CheckCircle2,
      primaryValue: isEmployee ? (metrics.myCompletedTasks ?? metrics.completedTasks) : metrics.completedTasks,
      subBadge: isTeamLead && metrics.myCompletedTasks !== undefined ? `My: ${metrics.myCompletedTasks}` : undefined,
      secondaryText: isEmployee ? "My completed" : isTeamLead ? "Team completed" : "Delivered deliverables",
      accentBg: "bg-teal-500/10 text-teal-500 border-teal-500/20",
      topBar: "from-teal-500 to-cyan-600",
    },
    {
      id: "overdue",
      title: "Overdue",
      filter: "Overdue",
      icon: XCircle,
      primaryValue: isEmployee ? (metrics.myOverdueTasks ?? metrics.overdueTasks) : metrics.overdueTasks,
      subBadge: isTeamLead && metrics.myOverdueTasks !== undefined ? `My: ${metrics.myOverdueTasks}` : undefined,
      secondaryText: isEmployee ? "My overdue" : isTeamLead ? "Team overdue" : "Requires attention",
      accentBg: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      topBar: "from-rose-500 to-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-5">
      {cards.map((card) => {
        const isActive = activeFilter.toLowerCase() === card.filter.toLowerCase();
        const Icon = card.icon;

        return (
          <div
            key={card.id}
            onClick={() => onFilterChange(card.filter)}
            className={`relative group cursor-pointer overflow-hidden rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between min-h-[140px] ${
              isActive
                ? "scale-[1.02] -translate-y-0.5 border-[#56348f] bg-purple-50/70 dark:bg-purple-950/40 shadow-md ring-2 ring-purple-500/30"
                : "border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:border-purple-300 dark:hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-md shadow-xs"
            }`}
          >
            {/* Top gradient glow bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.topBar} opacity-90`}
            />

            {/* Header: Title & Icon */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl border ${card.accentBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Middle: Primary Value & Sub badge for Team Lead */}
            <div className="my-2">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {loading ? "…" : card.primaryValue}
                </span>
                {card.subBadge && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {card.subBadge}
                  </span>
                )}
              </div>
            </div>

            {/* Footer label */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="truncate">{card.secondaryText}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
