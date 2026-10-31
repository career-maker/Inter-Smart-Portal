"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** "Open" button that goes to a page and shows a spinner (and ignores repeat clicks) until the next page is ready. */
export default function OpenLink({ href, label = "Open" }: { href: string; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={pending} aria-busy={pending} onClick={() => start(() => router.push(href))}>
      {pending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}{pending ? "Opening" : label}
    </Button>
  );
}
