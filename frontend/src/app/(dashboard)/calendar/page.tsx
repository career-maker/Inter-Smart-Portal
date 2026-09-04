"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Info
} from "lucide-react";
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isToday, isSameDay
} from "date-fns";
import api from "@/services/api";

import { Button } from "@/components/ui/button";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const res = await api.get(`/calendar?month=${month}&year=${year}`);
      setEvents(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  // Calculate padding days for the first week (0 = Sunday, 1 = Monday...)
  const firstDayOfMonth = startOfMonth(currentDate).getDay();
  const paddingDays = Array.from({ length: firstDayOfMonth }).map((_, i) => i);

  const getEventsForDay = (date: Date) => {
    const dayStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => {
      if (!e.date) return false;
      const eventStart = e.date.split(' ')[0].split('T')[0];
      if (!e.end_date) return eventStart === dayStr;
      const eventEnd = e.end_date.split(' ')[0].split('T')[0];
      return dayStr >= eventStart && dayStr <= eventEnd;
    });
  };

  const getEventStyle = (event: any) => {
    if (event.type === 'Holiday') return "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30 font-bold";
    if (event.type === 'WFH') return "bg-sky-100 text-sky-900 border-sky-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 font-bold";
    
    // It's a Leave
    if (event.status === 'Approved') return "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-bold";
    if (event.status === 'Rejected') return "bg-rose-100 text-rose-900 border-rose-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30 font-bold";
    return "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 font-bold"; // Pending
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Leave Calendar</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-0.5">View your time off, WFH days, and company holidays.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goToToday} className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 shadow-xs">Today</Button>
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-r-none border-r border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft className="h-4 w-4" /></Button>
            <div className="w-36 text-center font-bold text-sm text-slate-900 dark:text-white">
              {format(currentDate, 'MMMM yyyy')}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-l-none border-l border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-center text-xs md:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-4 rounded-xl flex-wrap text-slate-700 dark:text-slate-200 shadow-xs font-semibold">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-600 dark:bg-purple-500"></span> Holiday / Weekend</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-600 dark:bg-green-500"></span> Approved Leave</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Pending Leave</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-sky-500"></span> WFH</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500"></span> Rejected Leave</div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden relative shadow-sm">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#56348f]" />
          </div>
        )}
        
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
            <div key={day} className={`py-3 text-center text-xs font-bold uppercase tracking-wider ${
              idx === 0 || idx === 6 ? 'text-purple-700 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300'
            }`}>
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 auto-rows-[70px] md:auto-rows-[120px] bg-slate-200 dark:bg-slate-800 gap-[1px]">
          {/* Empty cells for days before the 1st */}
          {paddingDays.map(i => (
            <div key={`empty-${i}`} className="bg-slate-50/50 dark:bg-slate-900/30 p-2" />
          ))}
          
          {/* Actual days */}
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            
            return (
              <div 
                key={day.toString()} 
                onClick={() => setSelectedDate(day)}
                className={`p-2 flex flex-col gap-1 transition-colors cursor-pointer ${
                  isSelected 
                    ? 'bg-amber-50/90 dark:bg-amber-500/15 ring-2 ring-amber-500/60 z-10' 
                    : isWeekend
                      ? 'bg-slate-50/70 hover:bg-purple-50/40 dark:bg-slate-900/60 dark:hover:bg-slate-800/60'
                      : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50'
                }  ${!isCurrentMonth ? 'opacity-40' : ''}`}
              >
                <div className="flex justify-end">
                  <span className={`text-[11px] sm:text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    today 
                      ? 'bg-amber-500 text-white font-extrabold shadow-xs' 
                      : isSelected 
                        ? 'border border-amber-500 text-amber-700 dark:text-amber-400 font-extrabold'
                        : isWeekend
                          ? 'text-purple-700 dark:text-purple-400'
                          : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                {/* Desktop View: Full text event badges */}
                <div className="hidden md:block flex-1 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      title={`${event.title} (${event.status || 'Holiday'})`}
                      className={`text-[11px] leading-tight px-2 py-1 rounded-md border truncate font-bold cursor-help shadow-2xs ${getEventStyle(event)}`}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>

                {/* Mobile View: Small indicator dots */}
                <div className="md:hidden flex flex-wrap gap-1 justify-center mt-0.5">
                  {dayEvents.slice(0, 3).map(event => {
                    let dotColor = "bg-amber-500";
                    if (event.type === 'Holiday') dotColor = "bg-purple-600";
                    else if (event.type === 'WFH') dotColor = "bg-sky-500";
                    else if (event.status === 'Approved') dotColor = "bg-emerald-600";
                    else if (event.status === 'Rejected') dotColor = "bg-rose-500";
                    return (
                      <span key={event.id} className={`w-2 h-2 rounded-full ${dotColor}`} />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] text-slate-700 dark:text-slate-300 font-bold leading-none">+</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Events List */}
      {selectedDate && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-amber-500" />
              Events on {format(selectedDate, "dd MMMM yyyy")}
            </h3>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Selected Day
            </span>
          </div>

          {getEventsForDay(selectedDate).length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-2">No leaves, WFH requests, or holidays scheduled for this day.</p>
          ) : (
            <div className="space-y-3">
              {getEventsForDay(selectedDate).map((event: any) => {
                let badgeType = "Pending";
                let badgeClass = "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 font-bold";
                if (event.type === 'Holiday') {
                  badgeType = "Holiday";
                  badgeClass = "bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30 font-bold";
                } else if (event.type === 'WFH') {
                  badgeType = "Work From Home";
                  badgeClass = "bg-sky-100 text-sky-900 border border-sky-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 font-bold";
                } else if (event.status === 'Approved') {
                  badgeType = "Approved Leave";
                  badgeClass = "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-bold";
                } else if (event.status === 'Rejected') {
                  badgeType = "Rejected Leave";
                  badgeClass = "bg-rose-100 text-rose-900 border border-rose-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30 font-bold";
                }

                return (
                  <div key={event.id} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl gap-4">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{event.title}</p>
                      {event.type !== 'Holiday' && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Duration: {event.end_date ? `${event.date} to ${event.end_date}` : event.date}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeClass}`}>
                      {badgeType}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
