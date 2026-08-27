"use client";

export function PageLoader({ label = "Loading workspace..." }: { label?: string }) {
  return (
    <div className="fixed inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex flex-col items-center justify-center z-[9999] transition-all duration-300 font-sans">
      <div className="flex flex-col items-center gap-4 p-8 max-w-sm text-center">
        {/* Animated Brand Spinner */}
        <div className="relative flex items-center justify-center">
          {/* Outer glowing ring */}
          <div className="w-14 h-14 rounded-full border-[3px] border-purple-100 dark:border-purple-950/60 animate-pulse" />
          
          {/* Rotating gradient arc */}
          <div className="absolute w-14 h-14 rounded-full border-[3px] border-transparent border-t-[#56348f] dark:border-t-purple-400 border-r-[#56348f]/60 dark:border-r-purple-400/60 animate-spin" />
          
          {/* Inner pulsating dot */}
          <div className="absolute w-4 h-4 rounded-full bg-[#56348f] dark:bg-purple-400 shadow-sm animate-ping opacity-75" />
          <div className="absolute w-3 h-3 rounded-full bg-[#56348f] dark:bg-purple-400" />
        </div>

        {/* Text */}
        <div className="space-y-1 mt-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            {label}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Please wait a moment
          </p>
        </div>

        {/* Subtle shimmer bar */}
        <div className="w-36 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-[#56348f] dark:via-purple-400 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
