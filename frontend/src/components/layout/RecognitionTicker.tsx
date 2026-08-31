"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Sparkles, Cake, Megaphone } from "lucide-react";

interface RecognitionTickerProps {
  isDark?: boolean;
  isSidebarCollapsed?: boolean;
}

export function RecognitionTicker({ isDark = false, isSidebarCollapsed = true }: RecognitionTickerProps) {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchRecognitionsAndBirthdays = async () => {
      try {
        const [recognitionsRes, dashboardRes, announcementsRes] = await Promise.all([
          api.get("/active-recognitions"),
          api.get("/dashboard"),
          api.get("/announcements"),
        ]);

        const recognitions = (recognitionsRes.data?.data || []).map((r: any) => ({
          ...r,
          type: "recognition",
        }));

        const birthdays = (dashboardRes.data?.upcoming_birthdays || [])
          .filter((b: any) => b.days_remaining === 0)
          .map((b: any) => ({
            type: "birthday",
            id: b.id,
            user: { first_name: b.name.split(" ")[0], last_name: b.name.split(" ").slice(1).join(" ") || "" },
          }));

        const rawAnnouncements =
          announcementsRes.data?.data?.data ||
          announcementsRes.data?.data ||
          (Array.isArray(announcementsRes.data) ? announcementsRes.data : []);

        const pinnedAnnouncements = (Array.isArray(rawAnnouncements) ? rawAnnouncements : [])
          .filter((a: any) => Boolean(a.is_pinned) || a.is_pinned === 1 || a.is_pinned === "1" || a.is_pinned === true)
          .map((a: any) => ({
            ...a,
            type: "announcement",
          }));

        const allItems = [...pinnedAnnouncements, ...birthdays, ...recognitions];
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

  // Only show if we have items
  if (!items || items.length === 0) return null;

  const displayItems = items;

  // Calculate animation duration (faster speed: ~0.08s per char, min 14s)
  const totalChars = displayItems.reduce((acc, item) => {
    let text = "";
    if (item.type === "birthday") {
      text = `Happy Birthday ${item.user?.first_name || ""} ${item.user?.last_name || ""}! Wishing you a wonderful day filled with joy!`;
    } else if (item.type === "announcement") {
      text = `${item.title}: ${item.content || ""}`;
    } else {
      text = `Congratulations ${item.user?.first_name || ""} ${item.user?.last_name || ""} for being awarded as ${item.icon} ${item.title}! ${item.description || ""}`;
    }
    return acc + text.length;
  }, 0);

  const durationSeconds = Math.max(14, totalChars * 0.08);

  const leftOffsetClass = !isDark
    ? "left-0 md:left-[84px]"
    : isSidebarCollapsed
    ? "left-0 md:left-20"
    : "left-0 md:left-64";

  return (
    <div
      style={{
        backgroundColor: "#56348f",
        fontFamily: '"Google Sans", "Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className={`fixed bottom-0 right-0 z-30 ${leftOffsetClass} transition-all duration-300 ease-in-out text-white overflow-hidden h-9 sm:h-9.5 flex items-center border-t border-purple-700/60 shadow-2xl select-none`}
    >
      {/* Left Fixed Badge without icon, named 'Updates' */}
      <div className="shrink-0 z-20 flex items-center px-3.5 py-1 bg-[#432770] text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider border-r border-purple-600/60 shadow-xs">
        <span>Updates</span>
      </div>

      {/* Gradients to fade edges */}
      <div className="absolute left-20 top-0 bottom-0 w-6 bg-gradient-to-r from-[#56348f] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#56348f] to-transparent z-10 pointer-events-none" />

      {/* Marquee Track (Pure White Text, Faster Continuous Scroll) */}
      <div
        className="whitespace-nowrap flex gap-12 items-center hover:[animation-play-state:paused] cursor-default"
        style={{ animation: `marquee ${durationSeconds}s linear infinite` }}
      >
        {displayItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs sm:text-[13px] font-medium tracking-wide text-white">
            {item.type === "birthday" ? (
              <>
                <Cake className="w-4 h-4 text-white shrink-0" />
                <span className="text-white">
                  🎉 Happy Birthday <span className="text-white font-bold uppercase">{item.user?.first_name} {item.user?.last_name}</span>! Wishing you a wonderful day filled with joy! 🎂
                </span>
              </>
            ) : item.type === "announcement" ? (
              <>
                <Megaphone className="w-4 h-4 text-white shrink-0" />
                <span className="text-white">
                  📢 <span className="text-white font-bold">{item.title}</span>: <span className="text-white">{item.content?.substring(0, 140)}{item.content?.length > 140 ? "..." : ""}</span>
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white shrink-0" />
                <span className="text-white">
                  Congratulations <span className="text-white font-bold uppercase">{item.user?.first_name} {item.user?.last_name}</span> for being awarded as <span className="text-white font-bold">{item.icon} {item.title}</span>! {item.description?.length > 60 ? '' : item.description}
                </span>
              </>
            )}
          </div>
        ))}

        {/* Duplicate Track for Seamless Infinite Scrolling */}
        {displayItems.map((item, i) => (
          <div key={`dup-${i}`} className="flex items-center gap-2 text-xs sm:text-[13px] font-medium tracking-wide text-white" aria-hidden="true">
            {item.type === "birthday" ? (
              <>
                <Cake className="w-4 h-4 text-white shrink-0" />
                <span className="text-white">
                  🎉 Happy Birthday <span className="text-white font-bold uppercase">{item.user?.first_name} {item.user?.last_name}</span>! Wishing you a wonderful day filled with joy! 🎂
                </span>
              </>
            ) : item.type === "announcement" ? (
              <>
                <Megaphone className="w-4 h-4 text-white shrink-0" />
                <span className="text-white">
                  📢 <span className="text-white font-bold">{item.title}</span>: <span className="text-white">{item.content?.substring(0, 140)}{item.content?.length > 140 ? "..." : ""}</span>
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white shrink-0" />
                <span className="text-white">
                  Congratulations <span className="text-white font-bold uppercase">{item.user?.first_name} {item.user?.last_name}</span> for being awarded as <span className="text-white font-bold">{item.icon} {item.title}</span>! {item.description?.length > 60 ? '' : item.description}
                </span>
              </>
            )}
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
        `
      }} />
    </div>
  );
}
