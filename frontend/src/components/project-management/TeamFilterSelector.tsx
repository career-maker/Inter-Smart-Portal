"use client";

import React, { useEffect, useState } from "react";
import { Users, Filter } from "lucide-react";
import api from "@/services/api";
import { UiverseSelect } from "@/components/ui/UiverseSelect";

interface Team {
  id: number;
  name: string;
  code?: string;
}

interface TeamFilterSelectorProps {
  selectedTeamId: number | "all";
  onSelectTeam: (teamId: number | "all") => void;
  availableTeams?: Team[];
  className?: string;
  align?: "left" | "right";
}

let cachedAllTeams: Team[] | null = null;

export function TeamFilterSelector({
  selectedTeamId,
  onSelectTeam,
  availableTeams,
  className = "",
  align = "left",
}: TeamFilterSelectorProps) {
  const [teams, setTeams] = useState<Team[]>(() => availableTeams || cachedAllTeams || []);
  const [loading, setLoading] = useState(!availableTeams && !cachedAllTeams);

  useEffect(() => {
    if (availableTeams && availableTeams.length > 0) {
      setTeams(availableTeams);
      setLoading(false);
      return;
    }

    if (cachedAllTeams && cachedAllTeams.length > 0) {
      setTeams(cachedAllTeams);
      setLoading(false);
      return;
    }

    api.get("/teams?all=true")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        if (list.length > 0) {
          cachedAllTeams = list;
        }
        setTeams(list);
      })
      .catch((err) => console.warn("Failed to load teams list", err))
      .finally(() => setLoading(false));
  }, [availableTeams]);

  return (
    <div className={`relative inline-flex items-center z-20 ${className}`}>
      <UiverseSelect
        value={selectedTeamId}
        onChange={(val) => onSelectTeam(val === "all" ? "all" : Number(val))}
        placeholder="All Departments / Teams"
        className="min-w-[190px]"
        align={align}
      >
        <option value="all">All Departments / Teams</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </UiverseSelect>
    </div>
  );
}
