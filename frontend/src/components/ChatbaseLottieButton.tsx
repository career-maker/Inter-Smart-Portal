"use client";

import { useEffect, useState, useRef } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

declare global {
  interface Window {
    chatbase?: (...args: any[]) => void;
  }
}

export default function ChatbaseLottieButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const dotLottieRef = useRef<any>(null);

  // Wait for Chatbase to load, then hide its default bubble
  useEffect(() => {
    const tryHide = () => {
      // Inject CSS to hide the default Chatbase bubble button
      const styleId = "chatbase-hide-bubble";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          #chatbase-bubble-button,
          #chatbase-bubble-button-container,
          [id^="chatbase-bubble"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `;
        document.head.appendChild(style);
      }
      setReady(true);
    };

    // Try immediately and also after a delay (Chatbase loads async)
    tryHide();
    const timer = setTimeout(tryHide, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleToggle = () => {
    if (window.chatbase) {
      if (isOpen) {
        window.chatbase("close");
        setIsOpen(false);
      } else {
        window.chatbase("open");
        setIsOpen(true);
      }
    }
  };

  // Play animation on hover
  const handleMouseEnter = () => {
    dotLottieRef.current?.play();
  };

  const handleMouseLeave = () => {
    if (!isOpen) {
      dotLottieRef.current?.pause();
    }
  };

  return (
    <>
      {/* Floating Lottie Chat Button */}
      <button
        onClick={handleToggle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Open AI Assistant"
        className="chatbase-lottie-btn"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: isOpen
            ? "drop-shadow(0 0 12px rgba(139,92,246,0.8))"
            : "drop-shadow(0 4px 16px rgba(0,0,0,0.4))",
          transform: isOpen ? "scale(1.1)" : "scale(1)",
          transition: "transform 0.2s ease, filter 0.2s ease",
        }}
      >
        <DotLottieReact
          dotLottieRefCallback={(ref) => {
            dotLottieRef.current = ref;
          }}
          src="https://lottie.host/1f99bbee-848d-4ffe-b3c1-63c79cecccac/F4wgeiU3Y5.lottie"
          loop
          autoplay
          style={{ width: "64px", height: "64px" }}
        />
      </button>

      {/* Responsive offset on mobile to not overlap the fixed apply-leave button */}
      <style>{`
        @media (max-width: 768px) {
          .chatbase-lottie-btn {
            bottom: 88px !important;
            right: 16px !important;
            width: 56px !important;
            height: 56px !important;
          }
        }
      `}</style>
    </>
  );
}
