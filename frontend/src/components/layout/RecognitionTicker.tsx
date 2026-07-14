"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Sparkles, Cake, Megaphone } from "lucide-react";

export function RecognitionTicker() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchRecognitionsAndBirthdays = async () => {
      try {
        const [recognitionsRes, dashboardRes, announcementsRes] = await Promise.all([
          api.get("/active-recognitions"),
          api.get("/dashboard"),
          api.get("/announcements"),
        ]);

        const recognitions = (recognitionsRes.data.data || []).map((r: any) => ({
          ...r,
          type: "recognition",
        }));

        const birthdays = (dashboardRes.data.upcoming_birthdays || [])
          .filter((b: any) => b.days_remaining === 0)
          .map((b: any) => ({
            type: "birthday",
            id: b.id,
            user: { first_name: b.name.split(" ")[0], last_name: b.name.split(" ").slice(1).join(" ") || "" },
          }));

        const pinnedAnnouncements = (announcementsRes.data.data?.data || [])
          .filter((a: any) => a.is_pinned === true)
          .map((a: any) => ({
            ...a,
            type: "announcement",
          }));

        console.log("Ticker - Birthdays today:", birthdays);
        console.log("Ticker - Recognitions:", recognitions);
        console.log("Ticker - Pinned Announcements:", pinnedAnnouncements);

        const allItems = [...pinnedAnnouncements, ...birthdays, ...recognitions];
        console.log("Ticker - All items to display:", allItems);

        setItems(allItems);
      } catch (error) {
        console.error("Failed to fetch recognitions/birthdays/announcements for ticker", error);
      }
    };

    fetchRecognitionsAndBirthdays();
    // Refresh ticker every 5 minutes
    const interval = setInterval(fetchRecognitionsAndBirthdays, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Only show if we have real items
  if (!items || items.length === 0) return null;

  const displayItems = items;

  return (
    <div className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white overflow-hidden py-1.5 flex items-center relative border-b border-indigo-700/50 shadow-md">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-indigo-600 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-indigo-600 to-transparent z-10" />

      <div className="whitespace-nowrap flex gap-12 items-center animate-[marquee_25s_linear_infinite] hover:[animation-play-state:paused]">
        {displayItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            {item.type === "birthday" ? (
              <>
                <Cake className="w-4 h-4 text-yellow-300 animate-bounce" />
                <span>
                  🎉 Happy Birthday <span className="text-yellow-200 font-bold uppercase">{item.user.first_name} {item.user.last_name}</span>! Wishing you a wonderful day filled with joy! 🎂
                </span>
              </>
            ) : item.type === "announcement" ? (
              <>
                <Megaphone className="w-4 h-4 text-cyan-300 animate-pulse" />
                <span>
                  📢 <span className="text-cyan-200 font-bold">{item.title}</span>: {item.content?.substring(0, 100)}{item.content?.length > 100 ? "..." : ""}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>
                  Congratulations <span className="text-amber-200 font-bold uppercase">{item.user.first_name} {item.user.last_name}</span> for being awarded as <span className="text-amber-300 font-black tracking-widest">{item.icon} {item.title}</span>! {item.description?.length > 50 ? '' : item.description}
                </span>
              </>
            )}
          </div>
        ))}
        {/* Duplicate for seamless infinite scroll if fewer items */}
        {displayItems.map((item, i) => (
          <div key={`dup-${i}`} className="flex items-center gap-2 text-sm font-semibold tracking-wide" aria-hidden="true">
            {item.type === "birthday" ? (
              <>
                <Cake className="w-4 h-4 text-yellow-300 animate-bounce" />
                <span>
                  🎉 Happy Birthday <span className="text-yellow-200 font-bold uppercase">{item.user.first_name} {item.user.last_name}</span>! Wishing you a wonderful day filled with joy! 🎂
                </span>
              </>
            ) : item.type === "announcement" ? (
              <>
                <Megaphone className="w-4 h-4 text-cyan-300 animate-pulse" />
                <span>
                  📢 <span className="text-cyan-200 font-bold">{item.title}</span>: {item.content?.substring(0, 100)}{item.content?.length > 100 ? "..." : ""}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>
                  Congratulations <span className="text-amber-200 font-bold uppercase">{item.user.first_name} {item.user.last_name}</span> for being awarded as <span className="text-amber-300 font-black tracking-widest">{item.icon} {item.title}</span>! {item.description?.length > 50 ? '' : item.description}
                </span>
              </>
            )}
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
