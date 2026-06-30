"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Sparkles } from "lucide-react";

export function RecognitionTicker() {
  const [recognitions, setRecognitions] = useState<any[]>([]);

  useEffect(() => {
    const fetchActiveRecognitions = async () => {
      try {
        const res = await api.get("/active-recognitions");
        setRecognitions(res.data.data);
      } catch (error) {
        console.error("Failed to fetch recognitions for ticker", error);
      }
    };
    
    fetchActiveRecognitions();
    // Refresh ticker every 5 minutes
    const interval = setInterval(fetchActiveRecognitions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!recognitions || recognitions.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white overflow-hidden py-1.5 flex items-center relative z-50 border-b border-indigo-700/50 shadow-md">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-indigo-600 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-indigo-600 to-transparent z-10" />
      
      <div className="whitespace-nowrap flex gap-12 items-center animate-[marquee_25s_linear_infinite] hover:[animation-play-state:paused]">
        {recognitions.map((rec, i) => (
          <div key={i} className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>
              Congratulations <span className="text-amber-200 font-bold uppercase">{rec.user.first_name} {rec.user.last_name}</span> for being awarded as <span className="text-amber-300 font-black tracking-widest">{rec.icon} {rec.title}</span>! {rec.description.length > 50 ? '' : rec.description}
            </span>
          </div>
        ))}
        {/* Duplicate for seamless infinite scroll if fewer items */}
        {recognitions.map((rec, i) => (
          <div key={`dup-${i}`} className="flex items-center gap-2 text-sm font-semibold tracking-wide" aria-hidden="true">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>
              Congratulations <span className="text-amber-200 font-bold uppercase">{rec.user.first_name} {rec.user.last_name}</span> for being awarded as <span className="text-amber-300 font-black tracking-widest">{rec.icon} {rec.title}</span>! {rec.description.length > 50 ? '' : rec.description}
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
