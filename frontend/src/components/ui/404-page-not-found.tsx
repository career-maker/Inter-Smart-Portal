"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const router = useRouter();

  return (
    <section
      style={{
        fontFamily:
          '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="bg-white dark:bg-slate-950 min-h-screen flex items-center justify-center p-4 select-none"
    >
      <div className="container mx-auto">
        <div className="flex justify-center">
          <div className="w-full sm:w-10/12 md:w-8/12 text-center">
            {/* 404 Heading with requested animated GIF background */}
            <div
              className="bg-[url(https://cdn.21st.dev/assets/mirror/35/354f63f88b57aceea4536df0c0cff0c3592aa46fe887ff910751fefc12f3e76c.gif)] h-[250px] sm:h-[350px] md:h-[400px] bg-center bg-no-repeat bg-contain"
              aria-hidden="true"
            >
              <h1 className="text-center text-slate-900 dark:text-white text-6xl sm:text-7xl md:text-8xl pt-6 sm:pt-8 font-black tracking-tight">
                404
              </h1>
            </div>

            <div className="mt-[-50px]">
              <h3 className="text-2xl text-slate-900 dark:text-white sm:text-3xl font-bold mb-3 tracking-tight">
                Look like you&apos;re lost
              </h3>
              <p className="mb-6 text-slate-600 dark:text-slate-400 sm:mb-5 text-sm sm:text-base font-normal">
                The page you are looking for is not available!
              </p>

              <Button
                variant="default"
                onClick={() => router.push("/")}
                style={{ backgroundColor: "#56348f" }}
                className="my-5 text-white hover:opacity-90 font-semibold px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PageNotFoundDemo() {
  return (
    <div className="w-full">
      <NotFoundPage />
    </div>
  );
}

export default NotFoundPage;
