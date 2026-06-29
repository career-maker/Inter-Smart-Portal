"use client";

import { Activity, Bell, FileText, Calendar, CheckCircle2 } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export default function ActivityTimeline({ activities }: { activities: any[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white border rounded-xl shadow-sm p-6 text-center text-muted-foreground flex flex-col items-center justify-center">
        <Activity className="h-8 w-8 text-gray-300 mb-3" />
        <p>No recent activities found.</p>
      </div>
    );
  }

  const getIcon = (title: string = "") => {
    const lower = title.toLowerCase();
    if (lower.includes("leave")) return <Calendar className="w-4 h-4 text-emerald-600" />;
    if (lower.includes("document")) return <FileText className="w-4 h-4 text-blue-600" />;
    if (lower.includes("approved")) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    return <Bell className="w-4 h-4 text-gray-600" />;
  };

  const getColor = (title: string = "") => {
    const lower = title.toLowerCase();
    if (lower.includes("leave")) return "bg-emerald-100 border-emerald-200";
    if (lower.includes("document")) return "bg-blue-100 border-blue-200";
    if (lower.includes("approved")) return "bg-green-100 border-green-200";
    return "bg-gray-100 border-gray-200";
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm p-5">
      <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-indigo-500" />
        Recent Activities
      </h3>
      
      <div className="relative border-l border-gray-200 ml-3 space-y-6">
        {activities.map((activity, idx) => {
          const title = activity.data?.title || "Notification";
          const message = activity.data?.message || "";
          
          return (
            <div key={activity.id || idx} className="relative pl-6">
              <div 
                className={`absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full border ${getColor(title)} shadow-sm z-10`}
              >
                {getIcon(title)}
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{message}</p>
                </div>
                <time className="text-xs font-medium text-gray-400 whitespace-nowrap shrink-0">
                  {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
                </time>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
