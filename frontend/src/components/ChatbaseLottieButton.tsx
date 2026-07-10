"use client";

import { useEffect, useState, useRef } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function ChatbaseLottieButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dotLottieRef = useRef<any>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Load position from localStorage on mount
    const savedPosition = localStorage.getItem("chatbot-position");
    if (savedPosition) {
      try {
        setPosition(JSON.parse(savedPosition));
      } catch (e) {
        // Use default position if parsing fails
      }
    }

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
    // Don't toggle if we're currently dragging
    if (isDragging) return;
    const clicked = findAndClickChatbaseButton();
    if (clicked) {
      setIsOpen((prev) => !prev);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent text selection while dragging
    e.preventDefault();
    setIsDragging(true);

    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Keep button within viewport bounds with some padding
      const maxX = window.innerWidth - 64 - 16; // button width + padding
      const maxY = window.innerHeight - 64 - 16; // button height + padding

      const constrainedX = Math.max(16, Math.min(newX, maxX));
      const constrainedY = Math.max(16, Math.min(newY, maxY));

      setPosition({
        x: constrainedX,
        y: constrainedY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Save position to localStorage
      localStorage.setItem("chatbot-position", JSON.stringify({ x: position.x, y: position.y }));
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, position]);

  return (
    <>
      {/* Custom Lottie floating button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => dotLottieRef.current?.play()}
        onMouseLeave={() => {
          if (!isOpen) dotLottieRef.current?.pause();
        }}
        aria-label="Open AI Assistant"
        title="Ask the Portal AI Assistant (drag to move)"
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 99999,
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          border: "none",
          background: "transparent",
          cursor: isDragging ? "grabbing" : "grab",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: isOpen
            ? "drop-shadow(0 0 14px rgba(139,92,246,0.9))"
            : "drop-shadow(0 4px 16px rgba(0,0,0,0.5))",
          transform: isOpen ? "scale(1.12)" : "scale(1)",
          transition: isDragging ? "none" : "transform 0.25s ease, filter 0.25s ease",
          userSelect: "none",
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
            width: 56px !important;
            height: 56px !important;
          }
        }
      `}</style>
    </>
  );
}
