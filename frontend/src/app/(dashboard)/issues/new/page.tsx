"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewIssuePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/issues?new=1");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[450px] text-center p-8">
      <div className="w-8 h-8 border-3 border-[#56348f] border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
        Opening Helpdesk...
      </p>
    </div>
  );
}

