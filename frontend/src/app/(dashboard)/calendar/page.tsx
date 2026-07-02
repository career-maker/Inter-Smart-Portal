"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Info
} from "lucide-react";
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isToday
} from "date-fns";
import api from "@/services/api";

import { Button } from "@/components/ui/button";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
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
          <h1 className="text-3xl font-bold tracking-tight text-white">Leave Calendar</h1>
          <p className="text-slate-300">View your time off, WFH days, and company holidays.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goToToday} className="border-white/10 bg-white/5 text-white hover:bg-white/10">Today</Button>
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-r-none border-r border-white/10 text-slate-300 hover:text-white hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></Button>
            <div className="w-32 text-center font-semibold text-sm text-white">
              {format(currentDate, 'MMMM yyyy')}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-l-none border-l border-white/10 text-slate-300 hover:text-white hover:bg-white/10"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-center text-sm bg-white/5 border border-white/10 p-4 rounded-2xl flex-wrap text-slate-300">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Company Holiday</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Approved Leave</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Pending Leave</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> WFH</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Rejected Leave</div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden relative backdrop-blur-md">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        )}
        
        <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 auto-rows-[120px] bg-slate-900/10">
          {/* Empty cells for days before the 1st */}
          {paddingDays.map(i => (
            <div key={`empty-${i}`} className="border-b border-r border-white/10 bg-white/[0.02] p-2" />
          ))}
          
          {/* Actual days */}
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            
            return (
              <div 
                key={day.toString()} 
                className={`border-b border-r border-white/10 p-2 flex flex-col gap-1 transition-colors hover:bg-white/[0.04] ${!isCurrentMonth ? 'opacity-30' : ''}`}
              >
                <div className="flex justify-end">
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${today ? 'bg-amber-500 text-white font-bold' : 'text-slate-400'}`}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
