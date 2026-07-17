"use client";

import { useRef } from "react";
import { format } from "date-fns";
import { X, Download, Eye } from "lucide-react";

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

interface CertificateModalProps {
  recognition: Recognition;
  employeeName: string;
  onClose: () => void;
}

export function CertificateModal({ recognition, employeeName, onClose }: CertificateModalProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const certId = `REC-${String(recognition.id).padStart(4, "0")}-${new Date(recognition.start_date).getFullYear()}`;

  const handleDownload = async () => {
    if (!certRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0f172a",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificate-${employeeName.replace(/\s+/g, "_")}-${recognition.title.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const issuedBy = recognition.creator
    ? `${recognition.creator.first_name} ${recognition.creator.last_name}`
    : "Inter Smart Management";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Control Bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-foreground">Certificate Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-foreground font-bold text-sm px-4 py-2 rounded-xl transition-all"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Certificate */}
        <div
          ref={certRef}
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "2px solid #b45309",
            borderRadius: "16px",
            padding: "48px 56px",
            position: "relative",
            overflow: "hidden",
            fontFamily: "'Georgia', serif",
          }}
        >
          {/* Corner decorations */}
          <div style={{ position: "absolute", top: 16, left: 16, width: 64, height: 64, borderTop: "3px solid #b45309", borderLeft: "3px solid #b45309", borderRadius: "4px 0 0 0" }} />
          <div style={{ position: "absolute", top: 16, right: 16, width: 64, height: 64, borderTop: "3px solid #b45309", borderRight: "3px solid #b45309", borderRadius: "0 4px 0 0" }} />
          <div style={{ position: "absolute", bottom: 16, left: 16, width: 64, height: 64, borderBottom: "3px solid #b45309", borderLeft: "3px solid #b45309", borderRadius: "0 0 0 4px" }} />
          <div style={{ position: "absolute", bottom: 16, right: 16, width: 64, height: 64, borderBottom: "3px solid #b45309", borderRight: "3px solid #b45309", borderRadius: "0 0 4px 0" }} />

          {/* Background glow */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(180,83,9,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

          {/* Company Logo (Only logo, no text) */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <img src="/logo.png" alt="Logo" style={{ height: "60px", width: "auto", objectFit: "contain" }} />
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(180,83,9,0.2)" }} />
            <span style={{ color: "#b45309", fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Arial', sans-serif" }}>✦ ✦ ✦</span>
            <div style={{ flex: 1, height: 1, background: "rgba(180,83,9,0.2)" }} />
          </div>

          {/* Certificate Title */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h1 style={{
              fontSize: 36,
              fontWeight: 900,
              color: "#0f172a",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: 0,
              fontFamily: "'Georgia', serif",
            }}>
              Certificate of Achievement
            </h1>
          </div>

          {/* Presented to */}
          <p style={{ textAlign: "center", color: "rgba(15,23,42,0.6)", fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, fontFamily: "'Arial', sans-serif" }}>
            This certificate is proudly presented to
          </p>

          {/* Employee Name */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{
              display: "inline-block",
              borderBottom: "2px solid rgba(180,83,9,0.5)",
              paddingBottom: 8,
            }}>
              <h2 style={{
                fontSize: 38,
                fontWeight: 900,
                color: "#b45309",
                margin: 0,
                fontFamily: "'Georgia', serif",
                letterSpacing: "0.04em",
              }}>
                {employeeName}
              </h2>
            </div>
          </div>

          {/* For being awarded */}
          <p style={{ textAlign: "center", color: "rgba(15,23,42,0.6)", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16, fontFamily: "'Arial', sans-serif" }}>
            For being awarded
          </p>

          {/* Achievement Icon + Title */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 10 }}>
              {recognition.icon || "🏆"}
            </div>
            <div style={{
              display: "inline-block",
              background: "rgba(180,83,9,0.06)",
              border: "1px solid rgba(180,83,9,0.25)",
              borderRadius: 12,
              padding: "8px 28px",
            }}>
              <h3 style={{
                fontSize: 26,
                fontWeight: 900,
                color: "#b45309",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: 0,
                fontFamily: "'Arial', sans-serif",
              }}>
                {recognition.title}
              </h3>
            </div>
          </div>

          {/* Description */}
          {recognition.description && (
            <p style={{
              textAlign: "center",
              color: "rgba(15,23,42,0.8)",
              fontSize: 15,
              fontStyle: "italic",
              maxWidth: 600,
              margin: "0 auto 24px",
              lineHeight: 1.6,
              fontFamily: "'Georgia', serif",
            }}>
              "{recognition.description}"
            </p>
          )}

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(15,23,42,0.1)" }} />
            <div style={{ flex: 1, height: 1, background: "rgba(15,23,42,0.1)" }} />
          </div>

          {/* Bottom Info Grid */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 24 }}>
            {/* Left: Dates */}
            <div>
              <p style={{ color: "rgba(15,23,42,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4, fontFamily: "'Arial', sans-serif" }}>
                Award Period
              </p>
              <p style={{ color: "#0f172a", fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "'Arial', sans-serif" }}>
                {format(new Date(recognition.start_date), "dd MMM yyyy")} – {format(new Date(recognition.end_date), "dd MMM yyyy")}
              </p>
              <p style={{ color: "rgba(15,23,42,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4, marginTop: 12, fontFamily: "'Arial', sans-serif" }}>
                Issue Date
              </p>
              <p style={{ color: "#0f172a", fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "'Arial', sans-serif" }}>
                {format(new Date(recognition.created_at), "dd MMM yyyy")}
              </p>
              <p style={{ color: "rgba(15,23,42,0.4)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 12, marginBottom: 2, fontFamily: "'Arial', sans-serif" }}>
                Certificate ID
              </p>
              <p style={{ color: "#b45309", fontSize: 12, fontWeight: 700, fontFamily: "'Arial', sans-serif", margin: 0 }}>
                {certId}
              </p>
            </div>

            {/* Right: Signature */}
            <div style={{ textAlign: "right" }}>
              <div style={{
                borderBottom: "2px solid rgba(15,23,42,0.15)",
                paddingBottom: 8,
                marginBottom: 8,
                minWidth: 180,
              }}>
                <p style={{ color: "#0f172a", fontSize: 15, fontWeight: 700, fontStyle: "italic", margin: 0, fontFamily: "'Georgia', serif" }}>
                  {issuedBy}
                </p>
              </div>
              <p style={{ color: "rgba(15,23,42,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0, fontFamily: "'Arial', sans-serif" }}>
                Approved By HR
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
