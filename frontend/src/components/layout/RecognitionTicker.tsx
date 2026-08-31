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

  // Calculate animation duration (brisk, legible speed: ~0.07s per char, min 12s)
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

  const durationSeconds = Math.max(12, totalChars * 0.07);

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
      {/* High-Contrast Visible Updates Badge */}
      <div
        style={{ backgroundColor: "#3a1c68", color: "#ffffff" }}
        className="shrink-0 z-30 flex items-center px-4 h-full text-white font-bold text-xs uppercase tracking-wider border-r border-purple-600/60 shadow-sm"
      >
        <span style={{ color: "#ffffff", fontWeight: 700 }} className="text-white font-bold">
          UPDATES
        </span>
      </div>

      {/* Marquee Container with side fade */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#56348f] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#56348f] to-transparent z-10 pointer-events-none" />

        {/* Marquee Track (Pure White High Contrast Text) */}
        <div
          className="whitespace-nowrap flex gap-12 items-center hover:[animation-play-state:paused] cursor-default pl-4"
          style={{ animation: `marquee ${durationSeconds}s linear infinite` }}
        >
          {displayItems.map((item, i) => (
            <div
              key={i}
              style={{ color: "#ffffff" }}
              className="flex items-center gap-2 text-xs sm:text-[13px] font-medium tracking-wide !text-white"
            >
              {item.type === "birthday" ? (
                <>
                  <Cake className="w-4 h-4 !text-white shrink-0" />
                  <span style={{ color: "#ffffff" }} className="!text-white">
                    🎉 Happy Birthday <strong style={{ color: "#ffffff" }} className="!text-white font-bold uppercase">{item.user?.first_name} {item.user?.last_name}</strong>! Wishing you a wonderful day filled with joy! 🎂
                  </span>
                </>
              ) : item.type === "announcement" ? (
                <>
                  <Megaphone className="w-4 h-4 !text-white shrink-0" />
                  <span style={{ color: "#ffffff" }} className="!text-white">
                    📢 <strong style={{ color: "#ffffff" }} className="!text-white font-bold">{item.title}</strong>: <span style={{ color: "#ffffff" }} className="!text-white">{item.content?.substring(0, 140)}{item.content?.length > 140 ? "..." : ""}</span>
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 !text-white shrink-0" />
                  <span style={{ color: "#ffffff" }} className="!text-white">
                    Congratulations <strong style={{ color: "#ffffff" }} className="!text-white font-bold uppercase">{item.user?.first_name} {item.user?.last_name}</strong> for being awarded as <strong style={{ color: "#ffffff" }} className="!text-white font-bold">{item.icon} {item.title}</strong>! {item.description?.length > 60 ? '' : item.description}
                  </span>
                </>
              )}
            </div>
          ))}

          {/* Duplicate Track for Seamless Loop */}
          {displayItems.map((item, i) => (
            <div
              key={`dup-${i}`}
              style={{ color: "#ffffff" }}
              className="flex items-center gap-2 text-xs sm:text-[13px] font-medium tracking-wide !text-white"
              aria-hidden="true"
            >
              {item.type === "birthday" ? (
                <>
                  <Cake className="w-4 h-4 !text-white shrink-0" />
                  <span style={{ color: "#ffffff" }} className="!text-white">
                    🎉 Happy Birthday <strong style={{ color: "#ffffff" }} className="!text-white font-bold uppercase">{item.user?.first_name} {item.user?.last_name}</strong>! Wishing you a wonderful day filled with joy! 🎂
                  </span>
                </>
              ) : item.type === "announcement" ? (
                <>
                  <Megaphone className="w-4 h-4 !text-white shrink-0" />
                  <span style={{ color: "#ffffff" }} className="!text-white">
                    📢 <strong style={{ color: "#ffffff" }} className="!text-white font-bold">{item.title}</strong>: <span style={{ color: "#ffffff" }} className="!text-white">{item.content?.substring(0, 140)}{item.content?.length > 140 ? "..." : ""}</span>
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 !text-white shrink-0" />
                  <span style={{ color: "#ffffff" }} className="!text-white">
                    Congratulations <strong style={{ color: "#ffffff" }} className="!text-white font-bold uppercase">{item.user?.first_name} {item.user?.last_name}</strong> for being awarded as <strong style={{ color: "#ffffff" }} className="!text-white font-bold">{item.icon} {item.title}</strong>! {item.description?.length > 60 ? '' : item.description}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
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
