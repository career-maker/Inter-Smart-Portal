import re
import sys

def modify_dashboard(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add imports
    imports_to_add = """import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AttendanceWidget } from "@/components/dashboard/AttendanceWidget";
import { AchievementFlipCard } from "@/components/recognition/AchievementFlipCard";
import { LeaderboardWidget } from "@/components/dashboard/LeaderboardWidget";
"""
    content = re.sub(
        r'import \{ Dialog, DialogContent, DialogHeader, DialogTitle \} from "@/components/ui/dialog";\nimport \{ AttendanceWidget \} from "@/components/dashboard/AttendanceWidget";',
        imports_to_add,
        content
    )

    # Add Trophy, Medal, Crown to lucide-react import
    content = re.sub(
        r'Activity,\n  ShieldAlert\n\} from "lucide-react";',
        'Activity,\n  ShieldAlert,\n  Trophy,\n  Medal,\n  Crown\n} from "lucide-react";',
        content
    )

    # 2. Modify layout container classes and inline styles
    content = re.sub(
        r'<div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">',
        '<div\n      className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"\n      style={{ width: \'min(96vw, 1800px)\', margin: \'0 auto\', paddingLeft: \'clamp(12px, 1.5vw, 28px)\', paddingRight: \'clamp(12px, 1.5vw, 28px)\' }}\n    >',
        content
    )

    # 3. Replace CelebrationCard and Welcome Card with two-column layout
    old_celebration_and_welcome = """      {/* Active Recognition — Celebration Card */}
      {profile.active_recognition && (
        <CelebrationCard
          recognition={profile.active_recognition}
          firstName={profile.first_name}
        />
      )}

      {/* 
        ========================================
        HEADER: Personalized Dashboard
        ========================================
      */}
      <div className="rounded-3xl p-5 md:p-6 shadow-lg mb-6 bg-[#F4B400] text-slate-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 lg:gap-8 relative z-10">
          {/* Left: Avatar, Greeting, Date */}
          <div className="flex items-center gap-5 md:gap-6">
            <PhotoAvatar
              src={profile.profile_photo_path}
              name={`${profile.first_name} ${profile.last_name}`}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/40 text-slate-900 text-xl md:text-2xl shadow-sm shrink-0 border border-white/50"
              textClass="text-slate-900"
            />
            <div>
              <p className="text-sm font-medium text-slate-800/80 mb-1">
                {format(time, "EEEE, d MMMM yyyy")} • {format(time, "h:mm a")}
              </p>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center text-white">
                {greeting}, {profile.first_name} 
                <div className="relative w-[60px] h-[60px] ml-2 shrink-0">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <DotLottiePlayer src="https://lottie.host/5ec233ff-2cb3-499c-ac94-906625aeb28f/JZM0rMFaWb.lottie" autoplay loop style={{ width: '120px', height: '120px' }} />
                  </div>
                </div>
              </h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3">
                {profile.employee_code && (
                  <span className="inline-flex items-center gap-1.5 bg-black/5 text-slate-900 backdrop-blur-sm border border-black/10 px-3 py-1 rounded-full text-xs font-semibold tracking-wider shadow-sm">
                    {profile.employee_code}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 bg-black/5 text-slate-900 backdrop-blur-sm border border-black/10 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                  {profile.designation}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${
                  profile.attendance_status === 'Punched In' 
                    ? 'bg-emerald-100 text-emerald-300'
                    : profile.attendance_status === 'Punched Out'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-rose-100 text-rose-300'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {profile.attendance_status}
                </span>
              </div>
            </div>
          </div>
          
          {/* Right: Service Days — animated neon pill */}
          {profile.service_stats && (
            <div className="neon-pill-wrapper mt-4 lg:mt-0 w-full lg:w-auto shrink-0">
              <div className="neon-pill-inner px-6 py-3 text-center">
                <p className="text-sm md:text-base font-extrabold tracking-wide flex flex-wrap items-center justify-center gap-2 whitespace-nowrap"
                   style={{ color: '#0F172A', textShadow: '0 1px 2px rgba(255,255,255,0.25)' }}>
                  <span className="text-base leading-none">🌟</span>
                  Growing Together for{" "}
                  <span style={{ color: '#1E3A5F', fontWeight: 800 }}>
                    {profile.service_stats.years}Y {profile.service_stats.months}M {profile.service_stats.days}D
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>"""

    new_celebration_and_welcome = """      {/* 
        ========================================
        HEADER: Welcome Card + Achievement Flip Card (two-column)
        ========================================
      */}
      <div className={`flex gap-5 mb-6 ${hasActiveRec ? 'flex-col lg:flex-row items-stretch' : ''}`}>
        {/* Welcome Card — full width when no achievement, 72% when active achievement */}
        <div
          className="rounded-3xl p-5 md:p-6 shadow-lg bg-[#F4B400] text-slate-900 relative overflow-hidden transition-all duration-500"
          style={{ flex: hasActiveRec ? '0 0 72%' : '1 1 100%' }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 lg:gap-8 relative z-10">
            {/* Left: Avatar, Greeting, Date */}
            <div className="flex items-center gap-5 md:gap-6">
              <PhotoAvatar
                src={profile.profile_photo_path}
                name={`${profile.first_name} ${profile.last_name}`}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/40 text-slate-900 text-xl md:text-2xl shadow-sm shrink-0 border border-white/50"
                textClass="text-slate-900"
              />
              <div>
                <p className="text-sm font-medium text-slate-800/80 mb-1">
                  {format(time, "EEEE, d MMMM yyyy")} • {format(time, "h:mm a")}
                </p>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center text-white">
                  {greeting}, {profile.first_name}
                  <div className="relative w-[60px] h-[60px] ml-2 shrink-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <DotLottiePlayer src="https://lottie.host/5ec233ff-2cb3-499c-ac94-906625aeb28f/JZM0rMFaWb.lottie" autoplay loop style={{ width: '120px', height: '120px' }} />
                    </div>
                  </div>
                </h1>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3">
                  {profile.employee_code && (
                    <span className="inline-flex items-center gap-1.5 bg-black/5 text-slate-900 backdrop-blur-sm border border-black/10 px-3 py-1 rounded-full text-xs font-semibold tracking-wider shadow-sm">
                      {profile.employee_code}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 bg-black/5 text-slate-900 backdrop-blur-sm border border-black/10 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                    {profile.designation}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${
                    profile.attendance_status === 'Punched In'
                      ? 'bg-emerald-100 text-emerald-300'
                      : profile.attendance_status === 'Punched Out'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-rose-100 text-rose-300'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    {profile.attendance_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Service Days — animated neon pill */}
            {profile.service_stats && (
              <div className="neon-pill-wrapper mt-4 lg:mt-0 w-full lg:w-auto shrink-0">
                <div className="neon-pill-inner px-6 py-3 text-center">
                  <p
                    className="text-sm md:text-base font-extrabold tracking-wide flex flex-wrap items-center justify-center gap-2 whitespace-nowrap"
                    style={{ color: '#0F172A', textShadow: '0 1px 2px rgba(255,255,255,0.25)' }}
                  >
                    <span className="text-base leading-none">🌟</span>
                    Growing Together for{' '}
                    <span style={{ color: '#1E3A5F', fontWeight: 800 }}>
                      {profile.service_stats.years}Y {profile.service_stats.months}M {profile.service_stats.days}D
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Achievement Flip Card — only shown when employee has an active recognition */}
        {hasActiveRec && (
          <div
            className="lg:flex-1 min-h-[220px]"
            style={{ flex: '0 0 28%' }}
          >
            <AchievementFlipCard
              recognition={profile.active_recognition}
              employeeName={`${profile.first_name} ${profile.last_name}`}
              firstName={profile.first_name}
            />
          </div>
        )}
      </div>"""

    content = content.replace(old_celebration_and_welcome, new_celebration_and_welcome)

    # 4. Modify the Engagement Section grid
    content = content.replace(
        '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">',
        '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">'
    )

    # 5. Insert the Leaderboard widget after Upcoming Birthdays Widget
    content = content.replace(
        '<UpcomingBirthdaysWidget items={widgets.upcoming_birthdays} />\n      </div>',
        '<UpcomingBirthdaysWidget items={widgets.upcoming_birthdays} />\n\n        {/* Leaderboard Widget */}\n        <LeaderboardWidget />\n      </div>'
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Success")

if __name__ == "__main__":
    modify_dashboard("D:/iss/Inter Smart-Employee-Portal/frontend/src/app/(dashboard)/dashboard/page.tsx")
