"use client";

import { Monitor, Smartphone, Download } from "lucide-react";

// Stable links: the Windows installer is refreshed by desktop/publish.py, the APK by the "Build Android APK" workflow.
const WINDOWS_URL = "https://workplace.intersmart.in/api/desktop-updates/Inter-Smart-Portal-Setup.exe";
const APK_URL = "https://github.com/career-maker/Inter-Smart-Portal/releases/download/apk-latest/intersmart-portal.apk";

const APPS = [
  { name: "Windows app", icon: Monitor, url: WINDOWS_URL, cta: "Download for Windows", note: "Installer (.exe). Updates itself after install. If Windows SmartScreen warns, choose More info, then Run anyway." },
  { name: "Android app", icon: Smartphone, url: APK_URL, cta: "Download APK", note: "Open the file on your phone and allow installs from this source when asked. Feed and Chat." },
];

export default function AppDownloadsPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">App Downloads</h1>
        <p className="text-sm text-slate-500">These links always give the newest version.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {APPS.map(({ name, icon: Icon, url, cta, note }) => (
          <div key={name} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><Icon className="w-5 h-5 text-slate-700" /></span>
              <h2 className="font-semibold text-slate-900">{name}</h2>
            </div>
            <p className="text-xs text-slate-500 flex-1">{note}</p>
            <a href={url} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00a884] hover:bg-[#008f72] text-white text-sm font-semibold py-2.5">
              <Download className="w-4 h-4" /> {cta}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
