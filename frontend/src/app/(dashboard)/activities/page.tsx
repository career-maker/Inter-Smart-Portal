"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity, Palmtree, UserCircle, BookOpen, Loader2 } from "lucide-react";
import api from "@/services/api";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ActivitiesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    // Only Super Admin should view the global activity feed in this context
    if (user && user.role !== "Super Admin") {
      router.push("/dashboard");
      return;
    }
    fetchActivities(page);
  }, [user, page]);

  const fetchActivities = async (p: number) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/activities?page=${p}`);
      setData(res.data);
    } catch (e: any) {
      console.error(e);
      if (e.response?.status === 403) {
        router.push("/dashboard");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!data && isLoading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-6">
        <Link 
          href="/dashboard" 
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-cyan-600 hover:bg-cyan-50/70 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
            <Activity className="w-8 h-8 text-cyan-600" />
            All Activities
          </h1>
          <p className="text-muted-foreground mt-2">Organization-wide recent activity log.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60 p-6">
        <div className="space-y-6">
          {data?.data.map((act: any, i: number) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50/70 transition-colors border border-transparent hover:border-gray-100">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${act.type === 'leave' ? 'bg-orange-100 text-orange-600' : act.type === 'user' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                {act.type === 'leave' ? <Palmtree className="w-5 h-5"/> : act.type === 'user' ? <UserCircle className="w-5 h-5"/> : <BookOpen className="w-5 h-5"/>}
              </div>
              <div className="flex-1">
                <p className="text-base font-medium text-gray-900">{act.message}</p>
                <p className="text-sm text-gray-500 mt-1">{format(new Date(act.date), "MMMM d, yyyy 'at' h:mm a")}</p>
              </div>
            </div>
          ))}
          
          {(!data?.data || data.data.length === 0) && (
            <div className="text-center py-12 text-gray-500">
              No activities found.
            </div>
          )}
        </div>
        
        {/* Pagination Controls */}
        {data?.last_page > 1 && (
          <div className="flex items-center justify-between border-t mt-6 pt-6">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-semibold text-cyan-700 bg-cyan-50/70 rounded-lg disabled:opacity-50 hover:bg-cyan-100 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-gray-500">
              Page {data.current_page} of {data.last_page}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(data.last_page, p + 1))}
              disabled={page === data.last_page}
              className="px-4 py-2 text-sm font-semibold text-cyan-700 bg-cyan-50/70 rounded-lg disabled:opacity-50 hover:bg-cyan-100 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
