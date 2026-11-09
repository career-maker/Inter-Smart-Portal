"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DirectChatModule } from "@/components/chat/DirectChatModule";

function Chat() {
  const id = parseInt(useSearchParams().get("conversationId") || "", 10);
  // Override the desktop card sizing so the chat fills the screen between header and tab bar.
  return (
    <div className="h-full [&>div]:!h-full [&>div]:!rounded-none [&>div]:!border-0">
      <DirectChatModule initialConversationId={isNaN(id) ? null : id} />
    </div>
  );
}

export default function MobileChatPage() {
  return (
    <Suspense fallback={null}>
      <Chat />
    </Suspense>
  );
}
