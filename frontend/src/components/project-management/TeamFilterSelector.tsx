"use client";

import React, { useEffect, useState } from "react";
import { Users, Filter } from "lucide-react";
import api from "@/services/api";

interface Team {
  id: number;
  name: string;
  code?: string;
}

interface TeamFilterSelectorProps {
  selectedTeamId: number | "all";
  onSelectTeam: (teamId: number | "all") => void;
  className?: string;
}

let cachedAllTeams: Team[] | null = null;

export function TeamFilterSelector({
  selectedTeamId,
  onSelectTeam,
  className = "",
}: TeamFilterSelectorProps) {
  const [teams, setTeams] = useState<Team[]>(() => cachedAllTeams || []);
  const [loading, setLoading] = useState(!cachedAllTeams);

  useEffect(() => {
    if (cachedAllTeams) return;

    api.get("/teams")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        cachedAllTeams = list;
        setTeams(list);
      })
      .catch((err) => console.warn("Failed to load teams list", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <select
        value={selectedTeamId}
        onChange={(e) => onSelectTeam(e.target.value === "all" ? "all" : Number(e.target.value))}
        style={{
          fontFamily: '"Proxima Nova", sans-serif',
          fontSize: "13px",
          lineHeight: "20px",
          fontWeight: 400,
        }}
        className="pl-3 pr-8 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
        aria-label="Filter by Team"
      >
        <option value="all">All Departments / Teams</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
