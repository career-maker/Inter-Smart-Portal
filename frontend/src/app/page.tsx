"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setAuthCookie } from "@/lib/authCookies";
import { DashboardPageLoader } from "@/components/ui/PageLoader";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      setAuthCookie(token);
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return <DashboardPageLoader />;
}
