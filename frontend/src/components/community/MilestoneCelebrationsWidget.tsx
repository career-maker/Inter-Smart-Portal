"use client";

import { useState } from "react";
import { Cake, PartyPopper, UserPlus } from "lucide-react";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { format } from "date-fns";
import { WishTargetPerson } from "./BirthdayWishDrawer";

interface CelebrationsData {
  birthdays_today: any[];
  birthdays_upcoming: any[];
  anniversaries_today: any[];
  anniversaries_upcoming: any[];
  recently_joined: any[];
}

interface MilestoneCelebrationsWidgetProps {
  celebrations: CelebrationsData;
  onOpenWishDrawer: (person: WishTargetPerson) => void;
}

export function MilestoneCelebrationsWidget({
  celebrations,
  onOpenWishDrawer,
}: MilestoneCelebrationsWidgetProps) {
  const [activeTab, setActiveTab] = useState<"birthdays" | "anniversaries" | "joined">("birthdays");

  const bdayCount =
    (celebrations.birthdays_today?.length || 0) + (celebrations.birthdays_upcoming?.length || 0);
  const anniCount =
    (celebrations.anniversaries_today?.length || 0) + (celebrations.anniversaries_upcoming?.length || 0);
  const joinCount = celebrations.recently_joined?.length || 0;

  // Helper to format celebration dates
  const formatCelebrationDate = (dateStr?: string, daysRemaining?: number) => {
    if (daysRemaining === 0) return "Today! 🎂";
    if (!dateStr) return daysRemaining !== undefined ? `In ${daysRemaining}d` : "";
    try {
      const d = new Date(dateStr);
      const formatted = format(d, "MMM d");
      return daysRemaining !== undefined ? `${formatted} (in ${daysRemaining}d)` : formatted;
    } catch {
      return daysRemaining !== undefined ? `In ${daysRemaining}d` : dateStr;
    }
  };

  const allBirthdays = [
    ...(celebrations.birthdays_today || []).map((b) => ({ ...b, isToday: true })),
    ...(celebrations.birthdays_upcoming || []).map((b) => ({ ...b, isToday: false })),
  ];

  const allAnniversaries = [
    ...(celebrations.anniversaries_today || []).map((a) => ({ ...a, isToday: true })),
    ...(celebrations.anniversaries_upcoming || []).map((a) => ({ ...a, isToday: false })),
  ];

  const allJoined = celebrations.recently_joined || [];

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/60 shadow-xs p-5 flex flex-col justify-between w-full h-full min-h-[220px]"
    >
      {/* ── TABS HEADER ── */}
      <div className="flex items-center border-b border-slate-100 dark:border-slate-750 pb-2.5 gap-1 sm:gap-2 overflow-x-auto scrollbar-none flex-nowrap">
        {/* Tab 1: Birthdays */}
        <button
          type="button"
          onClick={() => setActiveTab("birthdays")}
          className="relative flex items-center gap-2 px-2.5 sm:px-3 py-1.5 cursor-pointer shrink-0 transition-all group"
        >
          <Cake
            className={`w-4 h-4 transition-colors ${
              activeTab === "birthdays"
                ? "text-[#56348f] dark:text-purple-400"
                : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"
            }`}
          />
          <span
            className={`text-xs sm:text-[13px] font-bold transition-colors ${
              activeTab === "birthdays"
                ? "text-[#56348f] dark:text-purple-400"
                : "text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
            }`}
          >
            Birthdays
          </span>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
              activeTab === "birthdays"
                ? "bg-purple-100 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300"
                : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"
            }`}
          >
            {bdayCount}
          </span>
          {/* Active bottom bar */}
          {activeTab === "birthdays" && (
            <span className="absolute -bottom-2.5 left-2 right-2 h-[3px] bg-[#56348f] dark:bg-purple-400 rounded-full" />
          )}
        </button>

        {/* Divider 1 */}
        <span className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0 self-center mx-1 sm:mx-1.5" />

        {/* Tab 2: Work Anniversaries */}
        <button
          type="button"
          onClick={() => setActiveTab("anniversaries")}
          className="relative flex items-center gap-2 px-2.5 sm:px-3 py-1.5 cursor-pointer shrink-0 transition-all group"
        >
          <PartyPopper
            className={`w-4 h-4 transition-colors ${
              activeTab === "anniversaries"
                ? "text-[#56348f] dark:text-purple-400"
                : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"
            }`}
          />
          <span
            className={`text-xs sm:text-[13px] font-bold transition-colors ${
              activeTab === "anniversaries"
                ? "text-[#56348f] dark:text-purple-400"
                : "text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
            }`}
          >
            Work Anniversaries
          </span>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
              activeTab === "anniversaries"
                ? "bg-purple-100 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300"
                : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"
            }`}
          >
            {anniCount}
          </span>
          {/* Active bottom bar */}
          {activeTab === "anniversaries" && (
            <span className="absolute -bottom-2.5 left-2 right-2 h-[3px] bg-[#56348f] dark:bg-purple-400 rounded-full" />
          )}
        </button>

        {/* Divider 2 */}
        <span className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0 self-center mx-1 sm:mx-1.5" />

        {/* Tab 3: Joined Recently */}
        <button
          type="button"
          onClick={() => setActiveTab("joined")}
          className="relative flex items-center gap-2 px-2.5 sm:px-3 py-1.5 cursor-pointer shrink-0 transition-all group"
        >
          <UserPlus
            className={`w-4 h-4 transition-colors ${
              activeTab === "joined"
                ? "text-[#56348f] dark:text-purple-400"
                : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"
            }`}
          />
          <span
            className={`text-xs sm:text-[13px] font-bold transition-colors ${
              activeTab === "joined"
                ? "text-[#56348f] dark:text-purple-400"
                : "text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
            }`}
          >
            Joined Recently
          </span>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
              activeTab === "joined"
                ? "bg-purple-100 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300"
                : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"
            }`}
          >
            {joinCount}
          </span>
          {/* Active bottom bar */}
          {activeTab === "joined" && (
            <span className="absolute -bottom-2.5 left-2 right-2 h-[3px] bg-[#56348f] dark:bg-purple-400 rounded-full" />
          )}
        </button>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="mt-3 flex-1 flex flex-col justify-between">
        {/* Section Heading */}
        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight mb-2.5">
          {activeTab === "birthdays" && "Upcoming Birthdays"}
          {activeTab === "anniversaries" && "Upcoming Anniversaries"}
          {activeTab === "joined" && "Joined Recently"}
        </h4>

        {/* Content Row: Cards on left/middle, Gift illustration on right */}
        <div className="flex items-center justify-between gap-4">
          {/* Left / Middle: Celebrant Cards List */}
          <div className="flex-1 min-w-0">
            {/* 1. BIRTHDAYS TAB */}
            {activeTab === "birthdays" && (
              <>
                {allBirthdays.length === 0 ? (
                  <div className="py-6 text-slate-400 dark:text-slate-500 text-xs italic">
                    No upcoming birthdays in the next 30 days.
                  </div>
                ) : (
                  <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                    {allBirthdays.map((person) => (
                      <div
                        key={person.id}
                        className="w-36 sm:w-44 p-3.5 sm:p-4 rounded-2xl border border-purple-100/90 dark:border-purple-900/40 bg-[#FAF9FF] dark:bg-purple-950/15 flex flex-col items-center text-center shadow-2xs hover:shadow-xs transition-all shrink-0"
                      >
                        {/* Avatar (with purple background and bold initials matching screenshot) */}
                        <div className="relative">
                          <RoyalAvatar
                            src={person.profile_photo_path}
                            name={person.name}
                            userId={person.id}
                            className="w-12 h-12 rounded-full font-bold text-sm ring-2 ring-purple-200/60 dark:ring-purple-800/50 bg-[#56348f] text-white"
                          />
                        </div>

                        {/* Name */}
                        <p className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white mt-2 truncate max-w-full">
                          <RoyalName name={person.name} userId={person.id} />
                        </p>

                        {/* Role */}
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-full">
                          {person.designation || "QA Analyst"}
                        </p>

                        {/* Date / Countdown */}
                        <span className="text-xs font-bold text-[#56348f] dark:text-purple-300 mt-2">
                          {formatCelebrationDate(person.date, person.days_remaining)}
                        </span>

                        {/* Wish Button for Today's Birthday */}
                        {person.days_remaining === 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenWishDrawer({
                                id: person.id,
                                name: person.name,
                                designation: person.designation,
                                profile_photo_path: person.profile_photo_path,
                                type: "birthday",
                              })
                            }
                            className="mt-2 w-full py-1 bg-[#56348f] hover:bg-purple-800 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            Wish 🎉
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 2. ANNIVERSARIES TAB */}
            {activeTab === "anniversaries" && (
              <>
                {allAnniversaries.length === 0 ? (
                  <div className="py-6 text-slate-400 dark:text-slate-500 text-xs italic">
                    No work anniversaries in the next 30 days.
                  </div>
                ) : (
                  <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                    {allAnniversaries.map((person) => (
                      <div
                        key={person.id}
                        className="w-36 sm:w-44 p-3.5 sm:p-4 rounded-2xl border border-pink-100/90 dark:border-pink-900/40 bg-[#FFF8FA] dark:bg-pink-950/15 flex flex-col items-center text-center shadow-2xs hover:shadow-xs transition-all shrink-0"
                      >
                        <div className="relative">
                          <RoyalAvatar
                            src={person.profile_photo_path}
                            name={person.name}
                            userId={person.id}
                            className="w-12 h-12 rounded-full font-bold text-sm ring-2 ring-pink-300/60 dark:ring-pink-800/50 bg-pink-600 text-white"
                          />
                        </div>

                        <p className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white mt-2 truncate max-w-full">
                          <RoyalName name={person.name} userId={person.id} />
                        </p>

                        <p className="text-[11px] font-medium text-pink-600 dark:text-pink-400 mt-0.5 truncate max-w-full">
                          {person.years} {person.years === 1 ? "Year" : "Years"} with Company
                        </p>

                        <span className="text-xs font-bold text-[#56348f] dark:text-purple-300 mt-2">
                          {formatCelebrationDate(person.date, person.days_remaining)}
                        </span>

                        {person.days_remaining === 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenWishDrawer({
                                id: person.id,
                                name: person.name,
                                designation: person.designation,
                                profile_photo_path: person.profile_photo_path,
                                type: "anniversary",
                                years: person.years,
                              })
                            }
                            className="mt-2 w-full py-1 bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            Wish 🎊
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 3. RECENTLY JOINED TAB */}
            {activeTab === "joined" && (
              <>
                {allJoined.length === 0 ? (
                  <div className="py-6 text-slate-400 dark:text-slate-500 text-xs italic">
                    No new members joined recently.
                  </div>
                ) : (
                  <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                    {allJoined.map((person) => (
                      <div
                        key={person.id}
                        className="w-36 sm:w-44 p-3.5 sm:p-4 rounded-2xl border border-emerald-100/90 dark:border-emerald-900/40 bg-[#F6FBF9] dark:bg-emerald-950/15 flex flex-col items-center text-center shadow-2xs hover:shadow-xs transition-all shrink-0"
                      >
                        <div className="relative">
                          <RoyalAvatar
                            src={person.profile_photo_path}
                            name={person.name}
                            userId={person.id}
                            className="w-12 h-12 rounded-full font-bold text-sm ring-2 ring-emerald-300/60 dark:ring-emerald-800/50 bg-emerald-600 text-white"
                          />
                        </div>

                        <p className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white mt-2 truncate max-w-full">
                          <RoyalName name={person.name} userId={person.id} />
                        </p>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-full">
                          {person.designation || "New Team Member"}
                        </p>

                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                          {person.joined_days_ago === 0 ? "Joined Today!" : `Joined ${person.joined_days_ago}d ago`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Pastel 3D Gift Boxes SVG Illustration (Matching Screenshot) */}
          <div className="hidden sm:flex shrink-0 w-32 md:w-36 h-28 md:h-32 items-center justify-center pointer-events-none select-none">
            <svg
              viewBox="0 0 140 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-2xs"
            >
              {/* Soft ground shadow ellipse */}
              <ellipse cx="78" cy="104" rx="52" ry="7" fill="#EEF2FF" className="dark:fill-slate-700/40" />

              {/* Confetti floating elements */}
              {/* Yellow slashes & dots */}
              <path d="M115 48L120 42" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="128" cy="68" r="1.5" fill="#FBBF24" />
              <path d="M42 52L46 47" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />

              {/* Blue slash & dots */}
              <path d="M124 56L130 52" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="106" cy="38" r="2" fill="#60A5FA" />
              <circle cx="34" cy="62" r="1.5" fill="#60A5FA" />

              {/* Pink dot */}
              <circle cx="38" cy="72" r="2" fill="#F43F5E" />

              {/* --- TALL PURPLE GIFT BOX (BACK) --- */}
              <g>
                {/* Box body */}
                <rect x="68" y="52" width="46" height="48" rx="4" fill="#C4B5FD" />
                {/* Box lid */}
                <rect x="65" y="48" width="52" height="9" rx="3" fill="#A78BFA" />

                {/* Box Vertical Ribbon */}
                <rect x="87" y="48" width="8" height="52" fill="#DDD6FE" />

                {/* Bow Loops on Top */}
                {/* Left bow loop */}
                <path
                  d="M91 48C84 41 74 38 78 33C82 28 90 39 91 48Z"
                  fill="#8B5CF6"
                />
                {/* Right bow loop */}
                <path
                  d="M91 48C98 41 108 38 104 33C100 28 92 39 91 48Z"
                  fill="#8B5CF6"
                />
                {/* Bow center knot */}
                <ellipse cx="91" cy="46" rx="3.5" ry="3" fill="#7C3AED" />
              </g>

              {/* --- SMALL PINK GIFT BOX (FRONT LEFT) --- */}
              <g>
                {/* Box body */}
                <rect x="42" y="70" width="36" height="34" rx="3" fill="#FECDD3" />
                {/* Box lid */}
                <rect x="40" y="67" width="40" height="7" rx="2.5" fill="#FDA4AF" />

                {/* Box Vertical Ribbon */}
                <rect x="56" y="67" width="7" height="37" fill="#F43F5E" />

                {/* Bow Loops on Pink Box */}
                {/* Left loop */}
                <path
                  d="M59 67C54 62 47 60 49 55C52 51 58 60 59 67Z"
                  fill="#F43F5E"
                />
                {/* Right loop */}
                <path
                  d="M60 67C65 62 72 60 70 55C67 51 61 60 60 67Z"
                  fill="#F43F5E"
                />
                {/* Center knot */}
                <circle cx="59.5" cy="66" r="2.5" fill="#E11D48" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
