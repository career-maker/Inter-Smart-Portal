"use client";

import { DotLottiePlayer } from "@dotlottie/react-player";
import "@dotlottie/react-player/dist/index.css";

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <DotLottiePlayer
        src="https://lottie.host/bd1ce9a0-98bf-484f-ad33-3be325975026/iaKUf4siFv.lottie"
        autoplay
        loop
        style={{ width: 160, height: 160 }}
      />
    </div>
  );
}
