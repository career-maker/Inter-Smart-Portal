"use client";

import { useState } from "react";
import { Cake, ChevronLeft, ChevronRight, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { format } from "date-fns";

interface UpcomingBirthdaysProps {
  items: any[];
}

export function UpcomingBirthdaysWithWishes({ items }: UpcomingBirthdaysProps) {
  const currentUser = useAuthStore((state) => state.user);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedBirthdayId, setSelectedBirthdayId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const itemsWithRecalculatedDays = (items || []).map((item: any) => {
    const itemDate = new Date(item.date);
    itemDate.setHours(0, 0, 0, 0);
    const daysRemaining = Math.round((itemDate.getTime() - today.getTime()) / 86400000);
    return { ...item, days_remaining: daysRemaining };
  });

  const upcomingItems = itemsWithRecalculatedDays.filter((item: any) => item.days_remaining >= 0);

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div className="mb-3">
        <h3
          style={{
            fontSize: "16px",
            lineHeight: "28px",
            fontWeight: 500,
            color: "rgb(15, 24, 36)"
          }}
          className="dark:text-white flex items-center gap-2"
        >
          <Cake className="w-4 h-4 text-amber-500" />
          Upcoming Birthdays
        </h3>
        <p
          style={{
            fontSize: "12px",
            lineHeight: "20px",
            color: "rgb(94, 105, 120)"
          }}
          className="dark:text-slate-400 font-normal"
        >
          Celebrations and wishes in next 30 days
        </p>
      </div>

      {upcomingItems.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No upcoming birthdays in the next 30 days.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {upcomingItems.slice(0, 3).map((person: any, idx: number) => {
            const isToday = person.days_remaining === 0;
            return (
              <div
                key={person.id || idx}
                className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200/60 dark:border-slate-800"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <RoyalAvatar
                    src={person.profile_photo_path}
                    name={person.name}
                    userId={person.id}
                    className="w-7 h-7 rounded-full shrink-0"
                  />
                  <div className="min-w-0">
                    <p
                      style={{
                        fontSize: "13px",
                        lineHeight: "20px",
                        fontWeight: 500
                      }}
                      className="text-slate-900 dark:text-white truncate"
                    >
                      <RoyalName name={person.name} userId={person.id} />
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        lineHeight: "16px",
                        color: "rgb(94, 105, 120)"
                      }}
                      className="dark:text-slate-400 truncate"
                    >
                      {person.designation || "Team Member"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isToday ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                      Today!
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                      {format(new Date(person.date), "MMM d")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
