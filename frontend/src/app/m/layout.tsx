"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, MessageCircle, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { PageLoader } from "@/components/ui/PageLoader";

// Mobile app shell (Android APK opens /m): feed + chat only, no portal sidebar/header.
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, logout } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try { localStorage.setItem("mobile_app", "1"); } catch {}
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace("/login");
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) return <PageLoader />;

  const tabs = [
    { href: "/m", label: "Feed", icon: Home },
    { href: "/m/chat", label: "Chat", icon: MessageCircle },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50">
      <header className="shrink-0 h-12 px-4 flex items-center justify-between bg-white border-b border-slate-200 pt-[env(safe-area-inset-top)] box-content">
        <span className="text-base font-semibold text-slate-900">Inter Smart</span>
        <button
          type="button"
          aria-label="Log out"
          onClick={() => { logout(); router.replace("/login"); }}
          className="p-2 -mr-2 text-slate-500"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>

      <nav className="shrink-0 grid grid-cols-2 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/m" ? pathname === "/m" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-[#56348f]" : "text-slate-500"}`}
            >
              <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
