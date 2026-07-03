"use client";

import { useEffect, useState, useRef } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function ChatbaseLottieButton() {
  const [isOpen, setIsOpen] = useState(false);
  const dotLottieRef = useRef<any>(null);

  useEffect(() => {
    // Hide the Chatbase bubble visually but keep it in the DOM so it stays functional
    const styleId = "chatbase-hide-bubble";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        /* Hide Chatbase's default bubble button visually, keep it clickable in DOM */
        #chatbase-bubble-button,
        #chatbase-bubble-button-container {
          opacity: 0 !important;
          pointer-events: none !important;
          position: fixed !important;
          bottom: 24px !important;
          right: 24px !important;
          width: 64px !important;
          height: 64px !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const findAndClickChatbaseButton = () => {
    // Try multiple selectors Chatbase uses across versions
    const selectors = [
      "#chatbase-bubble-button",
      "#chatbase-bubble-button-container button",
      "[id*='chatbase'] button",
      "button[aria-label*='chatbase' i]",
      "button[aria-label*='chat' i][id*='chatbase' i]",
    ];

    for (const sel of selectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) {
        el.click();
        return true;
      }
    }

    // Fallback: look for any iframe from chatbase and toggle via postMessage
    const iframe = document.querySelector<HTMLIFrameElement>(
      "iframe[src*='chatbase']"
    );
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "toggle" }, "*");
      return true;
    }

    return false;
  };

  const handleToggle = () => {
    const clicked = findAndClickChatbaseButton();
    if (clicked) {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <>
      {/* Custom Lottie floating button */}
      <button
        onClick={handleToggle}
        onMouseEnter={() => dotLottieRef.current?.play()}
        onMouseLeave={() => {
          if (!isOpen) dotLottieRef.current?.pause();
        }}
        aria-label="Open AI Assistant"
        title="Ask the Portal AI Assistant"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 99999,
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
            ? "drop-shadow(0 0 14px rgba(139,92,246,0.9))"
            : "drop-shadow(0 4px 16px rgba(0,0,0,0.5))",
          transform: isOpen ? "scale(1.12)" : "scale(1)",
          transition: "transform 0.25s ease, filter 0.25s ease",
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

      {/* Mobile offset — clear the fixed apply-leave bar */}
      <style>{`
        @media (max-width: 768px) {
          [aria-label="Open AI Assistant"] {
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
