"use client";

import { Clock, LogIn, LogOut } from "lucide-react";

interface TimelineEvent {
  type: string;
  time: string;
  event_id: number;
}

interface DailyActivityTimelineProps {
  rawPunches: TimelineEvent[];
  isCurrentlyWorking: boolean;
  firstIn?: string | null;
  lastOut?: string | null;
}

export function DailyActivityTimeline({
  rawPunches,
  isCurrentlyWorking,
}: DailyActivityTimelineProps) {
  if (!rawPunches || rawPunches.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        No activity recorded for this day.
      </div>
    );
  }

  const getEventLabel = (index: number, event: TimelineEvent) => {
    const isFirst = index === 0;
    const isLast = index === rawPunches.length - 1;
    const prevEvent = index > 0 ? rawPunches[index - 1] : null;
    const nextEvent = index < rawPunches.length - 1 ? rawPunches[index + 1] : null;

    if (event.type === "IN") {
      if (isFirst) {
        return "First Clock In";
      }
      if (prevEvent?.type === "OUT") {
        return "Clock In / Break Ended";
      }
      return "Clock In";
    }

    if (event.type === "OUT") {
      if (isLast && !isCurrentlyWorking) {
        return "Final Clock Out";
      }
      if (nextEvent?.type === "IN" || !isLast) {
        return "Clock Out / Break Started";
      }
      return "Clock Out";
    }

    return event.type;
  };

  const getIconColor = (event: TimelineEvent, index: number, isLast: boolean) => {
    if (event.type === "IN") {
      if (index === 0) return "text-green-500";
      return "text-blue-400";
    }
    if (event.type === "OUT") {
      if (isLast && !isCurrentlyWorking) return "text-red-500";
      return "text-amber-400";
    }
    return "text-slate-400";
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="space-y-1">
      {/* Timeline container */}
      <div className="relative pl-12">
        {/* Vertical line connecting all events */}
        {rawPunches.length > 1 && (
          <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gradient-to-b from-slate-600 to-slate-700"></div>
        )}

        {/* Events */}
        {rawPunches.map((event, index) => {
          const isLast = index === rawPunches.length - 1;
          const label = getEventLabel(index, event);
          const iconColor = getIconColor(event, index, isLast);

          return (
            <div key={`${event.event_id}-${index}`} className="relative mb-6 last:mb-0">
              {/* Event dot */}
              <div
                className={`absolute -left-8 top-1 w-6 h-6 rounded-full border-2 border-slate-800 bg-slate-900 flex items-center justify-center ${iconColor}`}
              >
                {event.type === "IN" ? (
                  <LogIn className="w-3 h-3" />
                ) : (
                  <LogOut className="w-3 h-3" />
                )}
              </div>

              {/* Event card */}
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4 hover:bg-slate-800 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">{label}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-300 font-mono">
                        {formatTime(event.time)}
                      </span>
                    </div>
                  </div>
                  {/* Status badge */}
                  {index === 0 && event.type === "IN" && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded font-medium">
                      Start
                    </span>
                  )}
                  {isLast && !isCurrentlyWorking && event.type === "OUT" && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded font-medium">
                      End
                    </span>
                  )}
                  {isLast && isCurrentlyWorking && event.type === "IN" && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-medium">
                      Working
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Final status message */}
      {isCurrentlyWorking && (
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-300 text-sm">
            <span className="font-semibold">Currently Working</span> — Employee has not checked
            out yet.
          </p>
        </div>
      )}
    </div>
  );
}
