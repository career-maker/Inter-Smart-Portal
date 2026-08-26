"use client";

import { useState, useMemo } from "react";
import { ProjectTask } from "@/types/pm";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { subDays, subMonths, isAfter, parseISO, format } from "date-fns";
import { Download } from "lucide-react";

interface PMDashboardChartsProps {
  tasks: ProjectTask[];
}

export function PMDashboardCharts({ tasks }: PMDashboardChartsProps) {
  const [statusTimeRange, setStatusTimeRange] = useState<string>("30d"); // '7d' | '30d' | '3m'

  // 1. Project Status Distribution (Pie / Donut Chart)
  const statusData = useMemo(() => {
    const today = new Date();
    let cutoffDate: Date;
    switch (statusTimeRange) {
      case "7d":
        cutoffDate = subDays(today, 7);
        break;
      case "3m":
        cutoffDate = subMonths(today, 3);
        break;
      case "30d":
      default:
        cutoffDate = subDays(today, 30);
    }

    const filtered = tasks.filter((t) => {
      if (!t.created_at) return true;
      try {
        const d = parseISO(t.created_at);
        return isAfter(d, cutoffDate);
      } catch {
        return true;
      }
    });

    const counts: Record<string, number> = {
      Completed: 0,
      "In Progress": 0,
      "Yet to Start": 0,
    };

    filtered.forEach((t) => {
      if (t.status === "Completed") {
        counts["Completed"]++;
      } else if (
        t.status === "In Progress" ||
        t.status === "Being Developed" ||
        t.status === "Ready for QA" ||
        t.status === "Assigned to QA"
      ) {
        counts["In Progress"]++;
      } else {
        counts["Yet to Start"]++;
      }
    });

    return [
      { name: "Completed", value: counts["Completed"], color: "#10b981" },
      { name: "In Progress", value: counts["In Progress"], color: "#f59e0b" },
      { name: "Yet to Start", value: counts["Yet to Start"], color: "#0ea5e9" },
    ].filter((item) => item.value > 0);
  }, [tasks, statusTimeRange]);

  // 2. Resource Allocation (Vertical Bar Chart)
  const resourceData = useMemo(() => {
    const counts: Record<string, number> = {};

    tasks.forEach((t) => {
      if (t.status !== "Completed" && t.status !== "Rejected") {
        if (t.assignees && t.assignees.length > 0) {
          t.assignees.forEach((a) => {
            const name = `${a.first_name || ""} ${a.last_name || ""}`.trim() || "Assignee";
            counts[name] = (counts[name] || 0) + 1;
          });
        } else {
          counts["Unassigned"] = (counts["Unassigned"] || 0) + 1;
        }
      }
    });

    const entries = Object.entries(counts).map(([name, count]) => ({
      name,
      tasks: count,
    }));

    entries.sort((a, b) => b.tasks - a.tasks);
    return entries.slice(0, 6); // Top 6 assignees
  }, [tasks]);

  // 3. Task Completion Trend (Line Chart)
  const trendData = useMemo(() => {
    // Generate 7 day completion trend
    const days = 7;
    const points = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, "dd MMM");

      // Count tasks created or completed up to this day
      const completedCount = tasks.filter((t) => {
        if (t.status !== "Completed") return false;
        if (!t.actual_completion_date && !t.updated_at) return true;
        try {
          const cDate = parseISO(t.actual_completion_date || t.updated_at);
          return cDate <= date;
        } catch {
          return true;
        }
      }).length;

      const totalCount = tasks.filter((t) => {
        if (!t.created_at) return true;
        try {
          const crDate = parseISO(t.created_at);
          return crDate <= date;
        } catch {
          return true;
        }
      }).length;

      points.push({
        name: dateStr,
        total: totalCount || tasks.length,
        completed: completedCount,
      });
    }

    return points;
  }, [tasks]);

  const handleExportResource = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Assignee,Active Tasks"].concat(resourceData.map((r) => `"${r.name}",${r.tasks}`)).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "resource_allocation.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportTrend = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Date,Total Deliverables,Completed Deliverables"]
        .concat(trendData.map((r) => `"${r.name}",${r.total},${r.completed}`))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "task_completion_trend.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 2-Column Grid: Distribution & Resource Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Project Status Distribution */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Project Status Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Breakdown of task delivery states
              </p>
            </div>
            <select
              value={statusTimeRange}
              onChange={(e) => setStatusTimeRange(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="3m">Last 3 months</option>
            </select>
          </div>

          <div className="h-[260px] w-full">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, left: 0, bottom: 0, right: 0 }}>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "12px",
                      border: "1px solid rgba(51, 65, 85, 0.8)",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                    formatter={(value) => (
                      <span className="text-slate-600 dark:text-slate-300 font-medium ml-1">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No status data in this time range
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Resource Allocation */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Resource Allocation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Active deliverable distribution by team member
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportResource}
              className="text-xs font-semibold text-slate-400 hover:text-blue-500 flex items-center gap-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          <div className="h-[260px] w-full">
            {resourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resourceData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    tick={{ fill: "#94a3b8" }}
                  />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "12px",
                      border: "1px solid rgba(51, 65, 85, 0.8)",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                    cursor={{ fill: "rgba(51, 65, 85, 0.2)" }}
                  />
                  <Bar dataKey="tasks" fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={34} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No active task allocations found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart 3: Task Completion Trend */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Task Completion Trend
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Trajectory of completed milestones versus total deliverables
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportTrend}
            className="text-xs font-semibold text-slate-400 hover:text-blue-500 flex items-center gap-1 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>

        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  borderRadius: "12px",
                  border: "1px solid rgba(51, 65, 85, 0.8)",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
              />
              <Line
                type="monotone"
                name="Total Deliverables"
                dataKey="total"
                stroke="#0ea5e9"
                strokeWidth={3}
                dot={{ r: 4, fill: "#0ea5e9" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                name="Completed"
                dataKey="completed"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: "#10b981" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
