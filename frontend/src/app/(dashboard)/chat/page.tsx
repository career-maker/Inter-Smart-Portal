"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DirectChatModule } from "@/components/chat/DirectChatModule";
import { AdminChatAuditView } from "@/components/chat/AdminChatAuditView";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuthStore } from "@/store/auth";
import { MessageSquare, ShieldAlert } from "lucide-react";

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.user);

  const isSuperAdmin =
    currentUser?.role === "Super Admin" ||
    (currentUser as any)?.roles?.some((r: any) => (r.name || r) === "Super Admin") ||
    (currentUser as any)?.is_super_admin === true;

  const viewParam = searchParams.get("view");
  const isAudit = isSuperAdmin && (viewParam === "audit" || viewParam === "admin-chats");

  const convParam = searchParams.get("conversationId");
  const initialConversationId = convParam ? parseInt(convParam, 10) : null;

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="pb-2 space-y-3"
    >
      {/* Super Admin Switcher (Only visible to Super Admin) */}
      {isSuperAdmin && (
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/chat")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !isAudit
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Direct Chat</span>
            </button>

            <button
              onClick={() => router.push("/chat?view=audit")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isAudit
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>View All Chats (Admin Audit)</span>
            </button>
          </div>
        </div>
      )}

      {/* Render Direct Chat or Admin Audit */}
      {isAudit ? (
        <AdminChatAuditView />
      ) : (
        <DirectChatModule initialConversationId={initialConversationId} />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ChatPageContent />
    </Suspense>
  );
}
