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
    if (event.type === 'Holiday') return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    if (event.type === 'WFH') return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    
    // It's a Leave
    if (event.status === 'Approved') return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    if (event.status === 'Rejected') return "bg-red-500/20 text-red-300 border-red-500/30";
    return "bg-amber-500/20 text-amber-300 border-amber-500/30"; // Pending
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Leave Calendar</h1>
          <p className="text-slate-600 dark:text-slate-300">View your time off, WFH days, and company holidays.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goToToday} className="border-slate-200 dark:border-white/10 bg-white/5 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10">Today</Button>
          <div className="flex items-center bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-r-none border-r border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></Button>
            <div className="w-32 text-center font-semibold text-sm text-slate-900 dark:text-white">
              {format(currentDate, 'MMMM yyyy')}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-l-none border-l border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-center text-sm bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-2xl flex-wrap text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Company Holiday</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Approved Leave</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Pending Leave</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> WFH</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Rejected Leave</div>
      </div>

      <div className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden relative backdrop-blur-md">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        )}
        
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/10 bg-white/5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 auto-rows-[65px] md:auto-rows-[120px] bg-slate-100/10 dark:bg-slate-900/10">
          {/* Empty cells for days before the 1st */}
          {paddingDays.map(i => (
            <div key={`empty-${i}`} className="border-b border-r border-slate-200 dark:border-white/10 bg-white/[0.02] p-2" />
          ))}
          
          {/* Actual days */}
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            
            return (
              <div 
                key={day.toString()} 
                onClick={() => setSelectedDate(day)}
                className={`border-b border-r border-slate-200 dark:border-white/10 p-2 flex flex-col gap-1 transition-colors cursor-pointer hover:bg-white/[0.04] ${
                  isSelected ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : ''
                }  ${!isCurrentMonth ? 'opacity-30' : ''}`}
              >
                <div className="flex justify-end">
                  <span className={`text-[10px] sm:text-xs font-semibold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                    today 
                      ? 'bg-amber-500 text-white font-bold' 
                      : isSelected 
                        ? 'border border-amber-500 text-amber-400 font-bold'
                        : 'text-slate-400'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                {/* Desktop View: Full text event badges */}
                <div className="hidden md:block flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      title={`${event.title} (${event.status})`}
                      className={`text-[10px] leading-tight px-1.5 py-1 rounded border truncate font-semibold cursor-help ${getEventStyle(event)}`}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>

                {/* Mobile View: Small indicator dots */}
                <div className="md:hidden flex flex-wrap gap-1 justify-center mt-0.5">
                  {dayEvents.slice(0, 3).map(event => {
                    let dotColor = "bg-amber-500";
                    if (event.type === 'Holiday') dotColor = "bg-purple-500";
                    else if (event.type === 'WFH') dotColor = "bg-blue-500";
                    else if (event.status === 'Approved') dotColor = "bg-emerald-500";
                    else if (event.status === 'Rejected') dotColor = "bg-red-500";
                    return (
                      <span key={event.id} className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] text-slate-500 font-bold leading-none">+</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Events List (Solves mobile readability) */}
      {selectedDate && (
        <div className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-amber-500" />
              Events on {format(selectedDate, "dd MMMM yyyy")}
            </h3>
            <span className="text-xs text-slate-500">
              Selected Day
            </span>
          </div>

          {getEventsForDay(selectedDate).length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-2">No leaves, WFH requests, or holidays scheduled for this day.</p>
          ) : (
            <div className="space-y-3">
              {getEventsForDay(selectedDate).map((event: any) => {
                let badgeType = "Pending";
                let badgeClass = "bg-amber-500/20 text-amber-300 border border-amber-500/30";
                if (event.type === 'Holiday') {
                  badgeType = "Holiday";
                  badgeClass = "bg-purple-500/20 text-purple-300 border border-purple-500/30";
                } else if (event.type === 'WFH') {
                  badgeType = "Work From Home";
                  badgeClass = "bg-blue-500/20 text-blue-300 border border-blue-500/30";
                } else if (event.status === 'Approved') {
                  badgeType = "Approved Leave";
                  badgeClass = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
                } else if (event.status === 'Rejected') {
                  badgeType = "Rejected Leave";
                  badgeClass = "bg-red-500/20 text-red-300 border border-red-500/30";
                }

                return (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl gap-4">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">{event.title}</p>
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
