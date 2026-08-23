"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/services/api";

interface TopAwardeeContextType {
  topAwardeeId: number | null;
  topAwardeeCode: string | null;
  totalAwards: number;
  topAwardee: any | null;
  isTopAwardee: (userOrId?: number | string | { id?: number; user_id?: number; employee_code?: string } | null) => boolean;
  setTopAwardeeFromLeaderboard: (leaderboardData: { top_performer_user_id?: number | null; data?: any[] }) => void;
  refreshTopAwardee: () => Promise<void>;
}

const TopAwardeeContext = createContext<TopAwardeeContextType>({
  topAwardeeId: null,
  topAwardeeCode: null,
  totalAwards: 0,
  topAwardee: null,
  isTopAwardee: () => false,
  setTopAwardeeFromLeaderboard: () => {},
  refreshTopAwardee: async () => {},
});

export function TopAwardeeProvider({ children }: { children: React.ReactNode }) {
  const [topAwardeeId, setTopAwardeeId] = useState<number | null>(null);
  const [topAwardeeCode, setTopAwardeeCode] = useState<string | null>(null);
  const [totalAwards, setTotalAwards] = useState<number>(0);
  const [topAwardee, setTopAwardee] = useState<any | null>(null);

  const setTopAwardeeFromLeaderboard = useCallback((lbData: { top_performer_user_id?: number | null; data?: any[] }) => {
    if (lbData?.top_performer_user_id) {
      const topUserId = Number(lbData.top_performer_user_id);
      const topEntry = lbData.data?.find((d: any) => Number(d.user_id) === topUserId || d.rank === 1);
      if (topEntry && Number(topEntry.total_achievements) > 0) {
        setTopAwardeeId(Number(topEntry.user_id));
        setTotalAwards(Number(topEntry.total_achievements));
        setTopAwardee(topEntry);
        return;
      }
    }
    const rank1 = lbData?.data?.find((d: any) => d.rank === 1 && Number(d.total_achievements) > 0);
    if (rank1) {
      setTopAwardeeId(Number(rank1.user_id));
      setTotalAwards(Number(rank1.total_achievements));
      setTopAwardee(rank1);
    }
  }, []);

  const fetchTopAwardee = async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token || window.location.pathname.startsWith("/login")) return;

    try {
      const res = await api.get("/recognitions/top-awardee");
      if (res.data?.top_awardee_id && Number(res.data?.total_awards) > 0) {
        setTopAwardeeId(Number(res.data.top_awardee_id));
        setTopAwardeeCode(res.data.employee?.employee_code || null);
        setTotalAwards(Number(res.data.total_awards));
        setTopAwardee(res.data.employee);
        return;
      }
    } catch {
      // Fallback to /recognitions/leaderboard
    }

    try {
      const lbRes = await api.get("/recognitions/leaderboard?period=overall");
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
    userOrId?: number | string | { id?: number; user_id?: number; employee_code?: string } | null
  ): boolean => {
    if (!topAwardeeId || totalAwards <= 0 || !userOrId) return false;

    if (typeof userOrId === "number") {
      return Number(userOrId) === Number(topAwardeeId);
    }

    if (typeof userOrId === "string") {
      if (userOrId === String(topAwardeeId) || Number(userOrId) === Number(topAwardeeId)) return true;
      if (topAwardeeCode && userOrId.toLowerCase() === topAwardeeCode.toLowerCase()) return true;
      return false;
    }

    if (typeof userOrId === "object") {
      if (userOrId.id && Number(userOrId.id) === Number(topAwardeeId)) return true;
      if (userOrId.user_id && Number(userOrId.user_id) === Number(topAwardeeId)) return true;
      if (topAwardeeCode && userOrId.employee_code && userOrId.employee_code.toLowerCase() === topAwardeeCode.toLowerCase()) {
        return true;
      }
    }

    return false;
  };

  return (
    <TopAwardeeContext.Provider
      value={{
        topAwardeeId,
        topAwardeeCode,
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
