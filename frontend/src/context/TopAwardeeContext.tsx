"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/services/api";

interface TopAwardeeContextType {
  topAwardeeId: number | null;
  topAwardeeCode: string | null;
  totalAwards: number;
  topAwardee: any | null;
  isTopAwardee: (userOrId?: number | string | { id?: number; user_id?: number; employee_code?: string } | null) => boolean;
  refreshTopAwardee: () => Promise<void>;
}

const TopAwardeeContext = createContext<TopAwardeeContextType>({
  topAwardeeId: null,
  topAwardeeCode: null,
  totalAwards: 0,
  topAwardee: null,
  isTopAwardee: () => false,
  refreshTopAwardee: async () => {},
});

export function TopAwardeeProvider({ children }: { children: React.ReactNode }) {
  const [topAwardeeId, setTopAwardeeId] = useState<number | null>(null);
  const [topAwardeeCode, setTopAwardeeCode] = useState<string | null>(null);
  const [totalAwards, setTotalAwards] = useState<number>(0);
  const [topAwardee, setTopAwardee] = useState<any | null>(null);

  const fetchTopAwardee = async () => {
    try {
      const res = await api.get("/recognitions/top-awardee");
      if (res.data?.top_awardee_id && res.data?.total_awards > 0) {
        setTopAwardeeId(res.data.top_awardee_id);
        setTopAwardeeCode(res.data.employee?.employee_code || null);
        setTotalAwards(res.data.total_awards);
        setTopAwardee(res.data.employee);
      } else {
        setTopAwardeeId(null);
        setTopAwardeeCode(null);
        setTotalAwards(0);
        setTopAwardee(null);
      }
    } catch {
      // Ignore if unauthenticated or error
    }
  };

  useEffect(() => {
    fetchTopAwardee();
  }, []);

  const isTopAwardee = (
    userOrId?: number | string | { id?: number; user_id?: number; employee_code?: string } | null
  ): boolean => {
    if (!topAwardeeId || totalAwards <= 0 || !userOrId) return false;

    if (typeof userOrId === "number") {
      return userOrId === topAwardeeId;
    }

    if (typeof userOrId === "string") {
      // Check if matches ID string or employee_code
      if (userOrId === String(topAwardeeId)) return true;
      if (topAwardeeCode && userOrId.toLowerCase() === topAwardeeCode.toLowerCase()) return true;
      return false;
    }

    if (typeof userOrId === "object") {
      if (userOrId.id && userOrId.id === topAwardeeId) return true;
      if (userOrId.user_id && userOrId.user_id === topAwardeeId) return true;
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
