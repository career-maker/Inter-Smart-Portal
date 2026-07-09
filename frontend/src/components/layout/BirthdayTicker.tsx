"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Cake } from "lucide-react";

export function BirthdayTicker() {
  const [birthdays, setBirthdays] = useState<any[]>([]);

  useEffect(() => {
    const fetchTodaysBirthdays = async () => {
      try {
        const res = await api.get("/today-birthdays");
        setBirthdays(res.data.data || []);
      } catch (error) {
        console.error("Failed to fetch birthdays for ticker", error);
      }
    };

    fetchTodaysBirthdays();
    // Refresh birthdays every hour
    const interval = setInterval(fetchTodaysBirthdays, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!birthdays || birthdays.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 text-white overflow-hidden py-1.5 flex items-center relative z-50 border-b border-pink-700/50 shadow-md">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-pink-600 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-pink-600 to-transparent z-10" />

      <div className="whitespace-nowrap flex gap-12 items-center animate-[marquee_30s_linear_infinite] hover:[animation-play-state:paused]">
        {birthdays.map((person, i) => (
          <div key={i} className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            <Cake className="w-5 h-5 text-yellow-300 animate-bounce" />
            <span>
              🎉 Happy Birthday <span className="text-yellow-200 font-bold uppercase">{person.first_name} {person.last_name}</span>! Wishing you a wonderful day filled with joy and success! 🎂
            </span>
          </div>
        ))}
        {/* Duplicate for seamless infinite scroll if fewer items */}
        {birthdays.map((person, i) => (
          <div key={`dup-${i}`} className="flex items-center gap-2 text-sm font-semibold tracking-wide" aria-hidden="true">
            <Cake className="w-5 h-5 text-yellow-300 animate-bounce" />
            <span>
              🎉 Happy Birthday <span className="text-yellow-200 font-bold uppercase">{person.first_name} {person.last_name}</span>! Wishing you a wonderful day filled with joy and success! 🎂
            </span>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(10%); }
          100% { transform: translateX(-100%); }
        }
      `}} />
    </div>
  );
}
