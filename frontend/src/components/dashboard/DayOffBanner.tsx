interface DayOffBannerProps {
  type: "weekend" | "holiday";
  name?: string | null;
}

const SCRIPT_FONT =
  '"Segoe Script", "Lucida Handwriting", "Snell Roundhand", "Apple Chancery", "Brush Script MT", cursive';

function CalendarIllustration({ day }: { day: string }) {
  return (
    <svg viewBox="0 0 170 130" className="w-full h-auto" role="img" aria-label={`${day} calendar`}>
      <defs>
        <radialGradient id="dob-sun" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#ffe27a" />
          <stop offset="100%" stopColor="#ffab1f" />
        </radialGradient>
        <linearGradient id="dob-head" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b9bff" />
          <stop offset="100%" stopColor="#2f6be0" />
        </linearGradient>
        <linearGradient id="dob-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e6eefc" />
        </linearGradient>
        <filter id="dob-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#2f4fa0" floodOpacity="0.25" />
        </filter>
        <filter id="dob-soft" x="-20%" y="-30%" width="140%" height="170%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#7aa0e6" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Sun */}
      <circle cx="122" cy="40" r="34" fill="#ffd85a" opacity="0.28" />
      <g stroke="#ffb020" strokeWidth="4" strokeLinecap="round">
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={122 + Math.cos(a) * 29}
              y1={40 + Math.sin(a) * 29}
              x2={122 + Math.cos(a) * 35}
              y2={40 + Math.sin(a) * 35}
            />
          );
        })}
      </g>
      <circle cx="122" cy="40" r="24" fill="url(#dob-sun)" />

      {/* Cloud behind calendar */}
      <g fill="#ffffff" filter="url(#dob-soft)">
        <circle cx="20" cy="88" r="11" />
        <circle cx="34" cy="82" r="14" />
        <circle cx="48" cy="90" r="11" />
        <rect x="9" y="88" width="50" height="13" rx="6.5" />
      </g>

      {/* Calendar */}
      <g transform="rotate(-5 74 84)" filter="url(#dob-shadow)">
        <rect x="30" y="42" width="88" height="76" rx="11" fill="url(#dob-body)" />
        <path d="M30 53a11 11 0 0 1 11-11h66a11 11 0 0 1 11 11v14H30z" fill="url(#dob-head)" />
        <rect x="50" y="34" width="9" height="20" rx="4.5" fill="#2a5ec9" />
        <rect x="52" y="36" width="5" height="9" rx="2.5" fill="#cfe0ff" />
        <rect x="89" y="34" width="9" height="20" rx="4.5" fill="#2a5ec9" />
        <rect x="91" y="36" width="5" height="9" rx="2.5" fill="#cfe0ff" />
        <text
          x="74"
          y="102"
          textAnchor="middle"
          fontSize="27"
          fontWeight="800"
          fill="#2a63d6"
          style={{ fontFamily: "Inter, system-ui, sans-serif", letterSpacing: "0.5px" }}
        >
          {day}
        </text>
      </g>

      {/* Cloud in front */}
      <g fill="#f6f9ff" filter="url(#dob-soft)">
        <circle cx="120" cy="108" r="10" />
        <circle cx="134" cy="102" r="13" />
        <circle cx="149" cy="109" r="10" />
        <rect x="110" y="108" width="50" height="12" rx="6" />
      </g>
    </svg>
  );
}

export function DayOffBanner({ type, name }: DayOffBannerProps) {
  const isWeekend = type === "weekend";
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Kolkata" })
    .format(new Date())
    .toUpperCase();

  const title = isWeekend ? "Happy Weekend" : name || "Company Holiday";
  const message = isWeekend
    ? `Today is ${name || "a weekend"}, a non-working day, so team attendance is not recorded. Wishing you and your team a restful weekend.`
    : "Today is an official company holiday, so team attendance is not recorded. Wishing you and your team a pleasant day off.";
  const tagline = isWeekend ? ["Take", "a Break"] : ["Enjoy", "the Day"];

  // Sizes respond to the card's width (container queries), not the viewport,
  // because the card is only 2/3 wide on desktop layouts.
  return (
    <div className="@container">
      <div className="relative overflow-hidden flex items-center gap-3 @md:gap-6 rounded-2xl bg-gradient-to-r from-[#dceafc] via-[#e3e9fb] to-[#e8e4fa] dark:from-[#1b2745] dark:via-[#202849] dark:to-[#2a2650] px-3 @md:px-6 py-4 @md:py-5 min-h-[120px] @md:min-h-[150px]">
        {/* Soft diagonal highlight on the right */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-1/3 bg-white/30 dark:bg-white/5 pointer-events-none [clip-path:polygon(40%_0,100%_0,100%_100%,0_100%)]"
        />

        <div className="w-24 @md:w-40 shrink-0 relative">
          <CalendarIllustration day={day} />
        </div>

        <div className="relative min-w-0 flex-1">
          <h3 className="text-xl @md:text-3xl font-extrabold tracking-tight text-[#0f1f5c] dark:text-white leading-tight">
            {title}
          </h3>
          <p className="mt-1.5 @md:mt-2 text-xs @md:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed max-w-md">
            {message}
          </p>
        </div>

        {/* Script tagline watermark */}
        <div
          aria-hidden
          className="hidden @2xl:flex relative shrink-0 flex-col items-end mr-4 -rotate-[8deg] select-none pointer-events-none text-[#9aa9d6] dark:text-indigo-300/50"
          style={{ fontFamily: SCRIPT_FONT }}
        >
          <span className="text-2xl italic leading-none">{tagline[0]}</span>
          <span className="text-2xl italic leading-none mt-1 -mr-2">{tagline[1]}</span>
          <svg viewBox="0 0 90 12" className="w-20 h-3 mt-1" fill="none">
            <path d="M2 8C25 1 55 1 88 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
