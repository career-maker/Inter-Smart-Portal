"use client";

import { useState } from "react";
import { Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { CertificateModal } from "./CertificateModal";
import { DotLottiePlayer } from "@dotlottie/react-player";

interface Recognition {
  id: number;
  title: string;
  icon?: string;
  description?: string;
  start_date: string;
  end_date: string;
  created_at: string;
  creator?: { first_name: string; last_name: string };
}

interface AchievementFlipCardProps {
  recognition: Recognition;
  employeeName: string;
  firstName: string;
}

export function AchievementFlipCard({ recognition, employeeName, firstName }: AchievementFlipCardProps) {
  const [showCert, setShowCert] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <>
      {/* Flip Card Container */}
      <div
        className={`achievement-flip-card ${isFlipped ? "flipped" : ""}`}
        style={{ width: "100%", height: "180px", perspective: "1000px" }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="achievement-flip-card-inner">
          {/* ── BACK (shown first visually — due to rotateY) ── */}
          <div className="achievement-flip-card-back">
            {/* Rotating border animation */}
            <div className="achievement-flip-border" />
            <div className="achievement-flip-back-content">
              {/* Icon */}
              <div style={{ fontSize: 24, marginBottom: 4 }}>{recognition.icon || "🏆"}</div>
              {/* Title */}
              <h3 style={{
                fontSize: 11,
                fontWeight: 900,
                color: "#fbbf24",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 2,
                lineHeight: 1.2,
                textAlign: "center",
              }}>
                {recognition.title}
              </h3>
              {/* Awarded to */}
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>
                Awarded To
              </p>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#ffffff", marginBottom: 4, textAlign: "center" }}>
                {firstName}
              </p>
              {/* Description */}
              {recognition.description && (
                <p style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.6)",
                  fontStyle: "italic",
                  textAlign: "center",
                  lineHeight: 1.3,
                  marginBottom: 4,
                  maxWidth: "90%",
                }}>
                  {recognition.description.length > 60
                    ? recognition.description.substring(0, 60) + "…"
                    : recognition.description}
                </p>
              )}
              {/* Valid period */}
              <div style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6,
                padding: "3px 8px",
                marginBottom: 6,
              }}>
                <p style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", textAlign: "center", margin: 0 }}>
                  📅 {format(new Date(recognition.start_date), "dd MMM")} – {format(new Date(recognition.end_date), "dd MMM yy")}
                </p>
              </div>
              {/* Buttons */}
              <div style={{ display: "flex", gap: 4, width: "100%" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCert(true); }}
                  style={{
                    flex: 1,
                    background: "rgba(251,191,36,0.15)",
                    border: "1px solid rgba(251,191,36,0.4)",
                    borderRadius: 6,
                    color: "#fbbf24",
                    fontSize: 8,
                    fontWeight: 700,
                    padding: "6px 4px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    transition: "all 0.2s",
                  }}
                >
                  <Eye style={{ width: 8, height: 8 }} />
                  View
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCert(true); }}
                  style={{
                    flex: 1,
                    background: "rgba(251,191,36,0.9)",
                    border: "none",
                    borderRadius: 6,
                    color: "#0f172a",
                    fontSize: 8,
                    fontWeight: 900,
                    padding: "6px 4px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    transition: "all 0.2s",
                  }}
                >
                  <Download style={{ width: 8, height: 8 }} />
                  PDF
                </button>
              </div>
            </div>
          </div>

          {/* ── FRONT (shown on hover) ── */}
          <div className="achievement-flip-card-front">
            {/* Floating orbs */}
            <div className="achievement-orb achievement-orb-1" />
            <div className="achievement-orb achievement-orb-2" />
            <div className="achievement-orb achievement-orb-3" />

            <div className="achievement-flip-front-content">
              {/* Badge label */}
              <span style={{
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 16,
                padding: "2px 8px",
                fontSize: 8,
                color: "rgba(255,255,255,0.6)",
                letterSpacing: "0.06em",
                backdropFilter: "blur(4px)",
                marginBottom: 8,
              }}>
                Employee Recognition
              </span>

              {/* Animated Lottie Trophy */}
              <div style={{
                marginBottom: 4,
                filter: "drop-shadow(0 0 12px rgba(251,191,36,0.35))",
                animation: "achievement-float 2.6s ease-in-out infinite",
                width: 70,
                height: 70,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <DotLottiePlayer
                  src="https://lottie.host/594c70e3-f79c-487a-9ef2-748faa04c2d5/mKivmdcAm1.lottie"
                  autoplay
                  loop
                  style={{ width: 70, height: 70 }}
                />
              </div>

              {/* Title */}
              <div style={{
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6,
                padding: "4px 10px",
                backdropFilter: "blur(6px)",
                marginBottom: 6,
              }}>
                <p style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: "#fbbf24",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  margin: 0,
                  textAlign: "center",
                }}>
                  {recognition.title}
                </p>
              </div>

              {/* Hint */}
              <p style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>
                Hover to View Details
              </p>
            </div>
          </div>
        </div>
      </div>

      {showCert && (
        <CertificateModal
          recognition={recognition}
          employeeName={employeeName}
          onClose={() => setShowCert(false)}
        />
      )}

      <style>{`
        .achievement-flip-card {
          cursor: pointer;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
        }
        .achievement-flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          transition: transform 400ms cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
        }
        .achievement-flip-card:hover .achievement-flip-card-inner,
        .achievement-flip-card.flipped .achievement-flip-card-inner {
          transform: rotateY(180deg);
        }
        .achievement-flip-card-front,
        .achievement-flip-card-back {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 20px;
          overflow: hidden;
          background-color: #151c2c;
          transform: translate3d(0, 0, 0);
          -webkit-transform: translate3d(0, 0, 0);
        }
        /* Back is the "info side" — rotated 180 so it faces us on hover */
        .achievement-flip-card-back {
          transform: rotateY(180deg) translate3d(0, 0, 0);
          -webkit-transform: rotateY(180deg) translate3d(0, 0, 0);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .achievement-flip-border {
          position: absolute;
          content: '';
          display: block;
          width: 160px;
          height: 200%;
          background: linear-gradient(90deg, transparent, #f59e0b, #fbbf24, #f59e0b, transparent);
          animation: achievement-border-spin 5000ms infinite linear;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        @keyframes achievement-border-spin {
          0%   { transform: translate(-50%, -50%) rotateZ(0deg); }
          100% { transform: translate(-50%, -50%) rotateZ(360deg); }
        }
        .achievement-flip-back-content {
          position: absolute;
          inset: 2px;
          background: linear-gradient(135deg, #151c2c 0%, #1e1b4b 100%);
          border-radius: 18px;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px 12px;
          gap: 0;
        }
        /* Front has the floating orbs bg */
        .achievement-flip-card-front {
          transform: rotateY(0deg);
          background: linear-gradient(135deg, #151c2c 0%, #1e2a4a 100%);
        }
        .achievement-flip-front-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px;
          z-index: 10;
        }
        .achievement-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(20px);
          animation: achievement-float 2.6s ease-in-out infinite;
        }
        .achievement-orb-1 {
          width: 80px; height: 80px;
          background: rgba(251,191,36,0.25);
          left: -20px; top: -20px;
        }
        .achievement-orb-2 {
          width: 120px; height: 120px;
          background: rgba(99,102,241,0.2);
          right: -30px; bottom: -30px;
          animation-delay: -0.8s;
        }
        .achievement-orb-3 {
          width: 40px; height: 40px;
          background: rgba(251,191,36,0.3);
          right: 20px; top: 20px;
          animation-delay: -1.8s;
        }
        @keyframes achievement-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(8px); }
        }
      `}</style>
    </>
  );
}
