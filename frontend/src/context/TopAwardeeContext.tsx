"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/services/api";

interface TopAwardeeContextType {
  topAwardeeId: number | null;
  topAwardeeCode: string | null;
  topAwardeeName: string | null;
  totalAwards: number;
  topAwardee: any | null;
  isTopAwardee: (userOrId?: number | string | { id?: number; user_id?: number; employee_code?: string; name?: string; first_name?: string } | null) => boolean;
  setTopAwardeeFromLeaderboard: (leaderboardData: any) => void;
  refreshTopAwardee: () => Promise<void>;
}

const TopAwardeeContext = createContext<TopAwardeeContextType>({
  topAwardeeId: null,
  topAwardeeCode: null,
  topAwardeeName: null,
  totalAwards: 0,
  topAwardee: null,
  isTopAwardee: () => false,
  setTopAwardeeFromLeaderboard: () => {},
  refreshTopAwardee: async () => {},
});

export function TopAwardeeProvider({ children }: { children: React.ReactNode }) {
  const [topAwardeeId, setTopAwardeeId] = useState<number | null>(null);
  const [topAwardeeCode, setTopAwardeeCode] = useState<string | null>(null);
  const [topAwardeeName, setTopAwardeeName] = useState<string | null>(null);
  const [totalAwards, setTotalAwards] = useState<number>(0);
  const [topAwardee, setTopAwardee] = useState<any | null>(null);

  const setTopAwardeeFromLeaderboard = useCallback((lbData: any) => {
    if (!lbData) return;
    const topUserId = Number(lbData?.stats?.top_performer_user_id || lbData?.top_performer_user_id || 0);
    const list: any[] = Array.isArray(lbData?.data) ? lbData.data : Array.isArray(lbData) ? lbData : [];

    if (topUserId > 0) {
      const topEntry = list.find((d: any) => Number(d.user_id) === topUserId || Number(d.id) === topUserId);
      if (topEntry && Number(topEntry.total_achievements) > 0) {
        setTopAwardeeId(Number(topEntry.user_id || topEntry.id));
        setTopAwardeeCode(topEntry.employee_code || null);
        setTopAwardeeName(topEntry.name || null);
        setTotalAwards(Number(topEntry.total_achievements));
        setTopAwardee(topEntry);
        return;
      }
    }

    const rank1 =
      list.find((d: any) => (d.rank === 1 || Number(d.rank) === 1) && Number(d.total_achievements) > 0) ||
      list.find((d: any) => Number(d.total_achievements) > 0);

    if (rank1) {
      setTopAwardeeId(Number(rank1.user_id || rank1.id));
      setTopAwardeeCode(rank1.employee_code || null);
      setTopAwardeeName(rank1.name || null);
      setTotalAwards(Number(rank1.total_achievements));
      setTopAwardee(rank1);
    }
  }, []);

  const fetchTopAwardee = async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token || window.location.pathname.startsWith("/login")) return;

    try {
      const res = await api.get(`/recognitions/top-awardee?_t=${Date.now()}`);
      if (res.data?.top_awardee_id && Number(res.data?.total_awards) > 0) {
        setTopAwardeeId(Number(res.data.top_awardee_id));
        setTopAwardeeCode(res.data.employee?.employee_code || null);
        setTopAwardeeName(res.data.employee?.name || `${res.data.employee?.first_name || ""} ${res.data.employee?.last_name || ""}`.trim() || null);
        setTotalAwards(Number(res.data.total_awards));
        setTopAwardee(res.data.employee);
        return;
      }
    } catch {
      // Fallback to /recognitions/leaderboard
    }

    try {
      const lbRes = await api.get(`/recognitions/leaderboard?period=overall&_t=${Date.now()}`);
      if (lbRes.data) {
        setTopAwardeeFromLeaderboard(lbRes.data);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchTopAwardee();
  }, [fetchTopAwardee]);

  const isTopAwardee = (
    userOrId?: number | string | { id?: number; user_id?: number; employee_code?: string; name?: string; first_name?: string } | null
  ): boolean => {
    if (!topAwardeeId || totalAwards <= 0 || !userOrId) return false;

    if (typeof userOrId === "number") {
      return Number(userOrId) === Number(topAwardeeId);
    }

    if (typeof userOrId === "string") {
      const strVal = userOrId.trim().toLowerCase();
      if (strVal === String(topAwardeeId)) return true;
      if (Number(strVal) === Number(topAwardeeId)) return true;
      if (topAwardeeCode && strVal === topAwardeeCode.toLowerCase()) return true;
      if (topAwardeeName) {
        const cleanTopName = topAwardeeName.trim().toLowerCase();
        if (strVal === cleanTopName || cleanTopName.includes(strVal) || strVal.includes(cleanTopName)) {
          return true;
        }
      }
      return false;
    }

    if (typeof userOrId === "object") {
      if (userOrId.id && Number(userOrId.id) === Number(topAwardeeId)) return true;
      if (userOrId.user_id && Number(userOrId.user_id) === Number(topAwardeeId)) return true;
      if (topAwardeeCode && userOrId.employee_code && userOrId.employee_code.toLowerCase() === topAwardeeCode.toLowerCase()) {
        return true;
      }
      if (topAwardeeName) {
        const cleanTopName = topAwardeeName.trim().toLowerCase();
        if (userOrId.name && cleanTopName.includes(userOrId.name.trim().toLowerCase())) return true;
        if (userOrId.first_name && cleanTopName.includes(userOrId.first_name.trim().toLowerCase())) return true;
      }
    }

    return false;
  };

  return (
    <TopAwardeeContext.Provider
      value={{
        topAwardeeId,
        topAwardeeCode,
        topAwardeeName,
        totalAwards,
        topAwardee,
        isTopAwardee,
        setTopAwardeeFromLeaderboard,
        refreshTopAwardee: fetchTopAwardee,
      }}
    >
      {children}
    </TopAwardeeContext.Provider>
  );
}

export function useTopAwardee() {
  return useContext(TopAwardeeContext);
}
