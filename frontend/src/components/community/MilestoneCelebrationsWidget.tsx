"use client";

import { useState } from "react";
import { Cake, PartyPopper, UserPlus, Gift, ChevronRight } from "lucide-react";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { format, parseISO } from "date-fns";
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

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm overflow-hidden"
    >
      {/* Tabs Header - Smooth mobile horizontal scroll with no clipping */}
      <div className="flex items-center border-b border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-850 px-2 sm:px-3 pt-2 overflow-x-auto flex-nowrap scrollbar-none">
        <button
          onClick={() => setActiveTab("birthdays")}
          style={{
            color: activeTab === "birthdays" ? "#56348f" : "rgb(94, 105, 120)",
            borderBottomColor: activeTab === "birthdays" ? "#56348f" : "transparent",
          }}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === "birthdays" ? "border-[#56348f]" : "border-transparent hover:text-slate-900"
          }`}
        >
          <Cake className="w-3.5 h-3.5" />
          <span>Birthdays</span>
          <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {bdayCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("anniversaries")}
          style={{
            color: activeTab === "anniversaries" ? "#56348f" : "rgb(94, 105, 120)",
            borderBottomColor: activeTab === "anniversaries" ? "#56348f" : "transparent",
          }}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === "anniversaries" ? "border-[#56348f]" : "border-transparent hover:text-slate-900"
          }`}
        >
          <PartyPopper className="w-3.5 h-3.5" />
          <span>Work Anniversaries</span>
          <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {anniCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("joined")}
          style={{
            color: activeTab === "joined" ? "#56348f" : "rgb(94, 105, 120)",
            borderBottomColor: activeTab === "joined" ? "#56348f" : "transparent",
          }}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === "joined" ? "border-[#56348f]" : "border-transparent hover:text-slate-900"
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Joined Recently</span>
          <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {joinCount}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-5">
        
        {/* ── BIRTHDAYS TAB ── */}
        {activeTab === "birthdays" && (
          <div>
            {bdayCount === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
                No upcoming birthdays in the next 30 days.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Today's Birthdays */}
                {celebrations.birthdays_today?.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-500 mb-2 flex items-center gap-1.5">
                      <span>🎂</span> Today&apos;s Celebrations
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {celebrations.birthdays_today.map((person) => (
                        <div
                          key={person.id}
                          className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-md p-3 text-center flex flex-col items-center justify-between hover:shadow-xs transition-all"
                        >
                          <RoyalAvatar
                            src={person.profile_photo_path}
                            name={person.name}
                            userId={person.id}
                            className="w-12 h-12 rounded-full mb-2 ring-2 ring-rose-400"
                          />
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-full">
                            <RoyalName name={person.name} userId={person.id} />
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full">
                            {person.designation}
                          </p>
                          <button
                            onClick={() =>
                              onOpenWishDrawer({
                                id: person.id,
                                name: person.name,
                                designation: person.designation,
                                profile_photo_path: person.profile_photo_path,
                                type: "birthday",
                              })
                            }
                            className="mt-2 w-full py-1 bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-semibold rounded shadow-xs transition-colors cursor-pointer"
                          >
                            Wish 🎉
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Birthdays */}
                {celebrations.birthdays_upcoming?.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 mt-4">
                      Upcoming Birthdays
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {celebrations.birthdays_upcoming.map((person) => (
                        <div
                          key={person.id}
                          className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-md p-3 text-center flex flex-col items-center justify-between hover:shadow-xs transition-all"
                        >
                          <RoyalAvatar
                            src={person.profile_photo_path}
                            name={person.name}
                            userId={person.id}
                            className="w-11 h-11 rounded-full mb-1.5"
                          />
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-full">
                            <RoyalName name={person.name} userId={person.id} />
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full">
                            {person.designation}
                          </p>
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mt-1 mb-1">
                            {format(new Date(person.date), "MMM d")} {person.days_remaining === 0 ? "(Today)" : `(in ${person.days_remaining}d)`}
                          </span>
                          
                          {/* Only show Wish button if it's today */}
                          {person.days_remaining === 0 && (
                            <button
                              onClick={() =>
                                onOpenWishDrawer({
                                  id: person.id,
                                  name: person.name,
                                  designation: person.designation,
                                  profile_photo_path: person.profile_photo_path,
                                  type: "birthday",
                                })
                              }
                              className="mt-2 w-full py-1 bg-purple-100 dark:bg-purple-950/40 text-[#56348f] dark:text-purple-300 hover:bg-[#56348f] hover:text-white text-[11px] font-semibold rounded transition-colors cursor-pointer"
                            >
                              Wish
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ANNIVERSARIES TAB ── */}
        {activeTab === "anniversaries" && (
          <div>
            {anniCount === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
                No work anniversaries in the next 30 days.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[...(celebrations.anniversaries_today || []), ...(celebrations.anniversaries_upcoming || [])].map((person) => (
                  <div
                    key={person.id}
                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-md p-3 text-center flex flex-col items-center justify-between hover:shadow-xs transition-all"
                  >
                    <RoyalAvatar
                      src={person.profile_photo_path}
                      name={person.name}
                      userId={person.id}
                      className="w-11 h-11 rounded-full mb-1.5 ring-2 ring-pink-400"
                    />
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-full">
                      <RoyalName name={person.name} userId={person.id} />
                    </p>
                    <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 mt-0.5">
                      {person.years} Year{person.years !== 1 ? 's' : ''} with Inter Smart
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 mb-1">
                      {person.days_remaining === 0 ? "Today!" : `In ${person.days_remaining} days`}
                    </span>
                    
                    {/* Only show Wish button if it's today */}
                    {person.days_remaining === 0 && (
                      <button
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
                        className="mt-2 w-full py-1 bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 hover:bg-pink-600 hover:text-white text-[11px] font-semibold rounded transition-colors cursor-pointer"
                      >
                        Wish 🎊
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RECENTLY JOINED TAB ── */}
        {activeTab === "joined" && (
          <div>
            {joinCount === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
                No new members joined recently.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {celebrations.recently_joined.map((person) => (
                  <div
                    key={person.id}
                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-md p-3 text-center flex flex-col items-center justify-between hover:shadow-xs transition-all"
                  >
                    <RoyalAvatar
                      src={person.profile_photo_path}
                      name={person.name}
                      userId={person.id}
                      className="w-11 h-11 rounded-full mb-1.5 ring-2 ring-emerald-400"
                    />
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-full">
                      <RoyalName name={person.name} userId={person.id} />
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full">
                      {person.designation}
                    </p>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                      Joined {person.joined_days_ago === 0 ? "Today" : `${person.joined_days_ago}d ago`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
