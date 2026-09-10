"use client";

import React from "react";
import { NetworkErrorWithGame } from "@/components/ui/NetworkErrorWithGame";

export default function GamePage() {
  return (
    <div className="w-full max-w-4xl mx-auto py-2 sm:py-6 px-2 sm:px-4">
      <NetworkErrorWithGame standalone />
    </div>
  );
}
