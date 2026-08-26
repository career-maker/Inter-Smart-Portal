"use client";

import React from "react";
import Link from "next/link";
import { Users2, Sparkles, MessageSquare, HeartHandshake, ArrowLeft, Trophy, Flame } from "lucide-react";

export default function CommunityComingSoonPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon Badge */}
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-500/30 mb-6 animate-bounce">
          <Users2 className="w-10 h-10 stroke-[1.75]" />
          <div className="absolute -top-1.5 -right-1.5 p-1.5 bg-amber-400 text-slate-950 rounded-full shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* Tag */}
        <div className="inline-block px-3.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-4 border border-purple-200/60 dark:border-purple-800/60">
          Coming Soon
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
          Community & Social Hub
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-lg mx-auto mb-8 leading-relaxed">
          We are building an interactive community space for Inter Smart teams to share achievements, celebrate peer kudos, join interest clubs, and connect across departments.
        </p>

        {/* Feature Teasers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <MessageSquare className="w-6 h-6 text-purple-600 mb-2" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Peer Shoutouts</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Praise teammates and share wins publicly on the company wall.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <Trophy className="w-6 h-6 text-amber-500 mb-2" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Company Contests</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Participate in monthly challenges, quizzes, and rewards.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <Flame className="w-6 h-6 text-rose-500 mb-2" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Interest Clubs</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Join gaming, fitness, photography, and tech discussions.</p>
          </div>
        </div>

        {/* Back Action */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#56348f] hover:bg-[#452774] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg shadow-purple-900/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
