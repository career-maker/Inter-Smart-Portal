"use client";

import { useEffect, useState, useRef } from "react";
import { MessageCircleQuestion } from "lucide-react";

export default function ChatbaseLottieButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isSidePopupOpen, setIsSidePopupOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const checkPopups = () => {
      const hasPopup = Boolean(
        document.body.classList.contains("side-popup-open") ||
        document.querySelector('[data-side-popup="true"]') ||
        document.querySelector('#employee-id-drawer') ||
        document.querySelector('.fixed.inset-y-0.right-0')
      );
      setIsSidePopupOpen(hasPopup);
    };

    checkPopups();
    const observer = new MutationObserver(checkPopups);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-side-popup"],
    });

    return () => observer.disconnect();
  }, []);

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
      const maxX = window.innerWidth - 48 - 16; // button width + padding
      const maxY = window.innerHeight - 48 - 16; // button height + padding

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
        aria-label="Open AI Assistant"
        title="Ask the Portal AI Assistant (drag to move)"
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 99999,
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          border: "1px solid #E4E4E7",
          background: isOpen ? "var(--portal-primary-color, #00806E)" : "#FFFFFF",
          color: isOpen ? "#FFFFFF" : "var(--portal-secondary-text, #52525B)",
          cursor: isDragging ? "grabbing" : "grab",
          padding: 0,
          display: isSidePopupOpen ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 4px 12px -4px rgba(0,0,0,0.12)",
          transition: isDragging ? "none" : "background-color 120ms cubic-bezier(0.2, 0, 0, 1), color 120ms cubic-bezier(0.2, 0, 0, 1)",
          userSelect: "none",
        }}
      >
        <MessageCircleQuestion aria-hidden="true" style={{ width: "20px", height: "20px" }} strokeWidth={1.5} />
      </button>

      {/* Hide on mobile devices AND whenever any side popup/drawer is open */}
      <style>{`
        @media (max-width: 768px) {
          [aria-label="Open AI Assistant"],
          #chatbase-bubble-button,
          #chatbase-bubble-button-container,
          #chatbase-message-bubbles,
          iframe[src*="chatbase"] {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
            visibility: hidden !important;
          }
        }

        body.side-popup-open [aria-label="Open AI Assistant"],
        body:has([data-side-popup="true"]) [aria-label="Open AI Assistant"],
        body:has(#employee-id-drawer) [aria-label="Open AI Assistant"],
        body:has(.fixed.inset-y-0.right-0) [aria-label="Open AI Assistant"],
        body.side-popup-open #chatbase-bubble-button,
        body.side-popup-open #chatbase-bubble-button-container,
        body.side-popup-open #chatbase-message-bubbles,
        body.side-popup-open iframe[src*="chatbase"],
        body:has([data-side-popup="true"]) #chatbase-bubble-button,
        body:has([data-side-popup="true"]) #chatbase-bubble-button-container,
        body:has([data-side-popup="true"]) #chatbase-message-bubbles,
        body:has([data-side-popup="true"]) iframe[src*="chatbase"],
        body:has(#employee-id-drawer) #chatbase-bubble-button,
        body:has(#employee-id-drawer) #chatbase-bubble-button-container,
        body:has(#employee-id-drawer) #chatbase-message-bubbles,
        body:has(#employee-id-drawer) iframe[src*="chatbase"] {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }
      `}</style>
    </>
  );
}
