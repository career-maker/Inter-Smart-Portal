"use client";

import React, { useState, useEffect } from "react";
import { Phone, Mail, LifeBuoy, Users, ShieldCheck, Wrench } from "lucide-react";
import api from "@/services/api";

interface TeamLeadContact {
  id: number | string;
  name: string;
  role: string;
  initials: string;
  avatarBg: string;
  email: string;
  phone?: string;
}

const FALLBACK_TEAM_LEADS: TeamLeadContact[] = [
  {
    id: "tl-1",
    name: "Manu K O",
    role: "Lead PHP Developer",
    initials: "MK",
    avatarBg: "bg-indigo-500",
    email: "manu@intersmart.in",
  },
  {
    id: "tl-2",
    name: "Vishal Ramesh",
    role: "Lead UI/UX Developer",
    initials: "VR",
    avatarBg: "bg-sky-500",
    email: "vishal@intersmart.in",
  },
  {
    id: "tl-3",
    name: "Abhiram P Mohan",
    role: "Lead QA Analyst",
    initials: "AP",
    avatarBg: "bg-amber-500",
    email: "abhiram@intersmart.in",
  },
  {
    id: "tl-4",
    name: "Aswathi M",
    role: "Team Lead",
    initials: "AS",
    avatarBg: "bg-teal-500",
    email: "aswathi@intersmart.in",
  },
];

export function EmergencyContactsCard({
  title = "Emergency Contacts",
  subtitle = "We're here to assist you",
}: {
  title?: string;
  subtitle?: string;
}) {
  const [teamLeads, setTeamLeads] = useState<TeamLeadContact[]>(FALLBACK_TEAM_LEADS);

  useEffect(() => {
    const fetchTeamLeads = async () => {
      try {
        const res = await api.get("/employees?per_page=100");
        const list = res.data?.data || [];
        const filtered = list.filter((emp: any) => {
          const role = (emp.role || "").toLowerCase();
          const desig = (emp.designation || "").toLowerCase();
          return (
            role.includes("team lead") ||
            role.includes("lead") ||
            desig.includes("lead") ||
            emp.is_team_lead
          );
        });

        if (filtered.length > 0) {
          const avatarColors = [
            "bg-indigo-500",
            "bg-sky-500",
            "bg-amber-500",
            "bg-teal-500",
            "bg-emerald-500",
            "bg-purple-500",
          ];

          const formatted: TeamLeadContact[] = filtered.map((emp: any, idx: number) => {
            const first = emp.first_name || "";
            const last = emp.last_name || "";
            const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "TL";
            return {
              id: emp.id,
              name: `${first} ${last}`.trim(),
              role: emp.designation || emp.role || "Team Lead",
              initials,
              avatarBg: avatarColors[idx % avatarColors.length],
              email: emp.email || "",
              phone: emp.phone || emp.mobile || "",
            };
          });
          setTeamLeads(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic team leads for Emergency Contacts", err);
      }
    };

    fetchTeamLeads();
  }, []);

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="bg-white dark:bg-slate-800 rounded-md p-5 sm:p-6 border border-slate-200/90 dark:border-slate-700/60 shadow-sm transition-all hover:shadow-md flex flex-col justify-between"
    >
      {/* Card Header matching exact Keka typography */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2
            style={{
              fontSize: "16px",
              lineHeight: "28px",
              fontWeight: 500,
              color: "rgb(15, 24, 36)",
            }}
            className="dark:text-white flex items-center gap-2"
          >
            <LifeBuoy className="w-4 h-4 text-[#56348f] dark:text-purple-400 shrink-0" />
            <span>{title}</span>
          </h2>
        </div>
        <p
          style={{
            fontSize: "12px",
            lineHeight: "20px",
            color: "rgb(94, 105, 120)",
          }}
          className="dark:text-slate-400 font-normal"
        >
          {subtitle}
        </p>
      </div>

      {/* Contacts List */}
      <div className="space-y-4">
        
        {/* ── 1. TEAM HR SECTION ── */}
        <div className="space-y-1.5 pb-3.5 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              HR
            </div>
            <div className="min-w-0 flex-1">
              <div
                style={{
                  fontSize: "13px",
                  lineHeight: "20px",
                  fontWeight: 500,
                  color: "rgb(15, 24, 36)",
                }}
                className="dark:text-white truncate"
              >
                Sahad, Nobby
              </div>
              <div
                style={{
                  fontSize: "12px",
                  lineHeight: "18px",
                  color: "rgb(94, 105, 120)",
                }}
                className="dark:text-slate-400 font-normal"
              >
                Team HR
              </div>
            </div>
          </div>

          <div className="pl-12">
            <a
              href="mailto:hr@intersmart.in"
              style={{
                fontSize: "13px",
                lineHeight: "20px",
                color: "#56348f",
              }}
              className="dark:text-purple-400 flex items-center gap-2 hover:underline transition-colors group cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#56348f] shrink-0" />
              <span className="font-medium truncate">hr@intersmart.in</span>
            </a>
          </div>
        </div>

        {/* ── 2. TEAM LEADS AUTO-LIST SECTION ── */}
        {teamLeads.map((tl) => (
          <div
            key={tl.id}
            className="space-y-1.5 pb-3.5 border-b border-slate-100 dark:border-slate-700/50"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full ${tl.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm`}
              >
                {tl.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  style={{
                    fontSize: "13px",
                    lineHeight: "20px",
                    fontWeight: 500,
                    color: "rgb(15, 24, 36)",
                  }}
                  className="dark:text-white truncate"
                >
                  {tl.name}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    lineHeight: "18px",
                    color: "rgb(94, 105, 120)",
                  }}
                  className="dark:text-slate-400 font-normal truncate"
                >
                  {tl.role}
                </div>
              </div>
            </div>

            <div className="pl-12 space-y-0.5">
              {tl.email && (
                <a
                  href={`mailto:${tl.email}`}
                  style={{
                    fontSize: "13px",
                    lineHeight: "20px",
                    color: "#56348f",
                  }}
                  className="dark:text-purple-400 flex items-center gap-2 hover:underline transition-colors group cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#56348f] shrink-0" />
                  <span className="font-medium truncate">{tl.email}</span>
                </a>
              )}
              {tl.phone && (
                <a
                  href={`tel:${tl.phone}`}
                  style={{
                    fontSize: "13px",
                    lineHeight: "20px",
                    color: "rgb(15, 24, 36)",
                  }}
                  className="dark:text-slate-200 flex items-center gap-2 hover:text-[#56348f] dark:hover:text-purple-300 transition-colors group cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#56348f] shrink-0" />
                  <span className="font-normal">{tl.phone}</span>
                </a>
              )}
            </div>
          </div>
        ))}

        {/* ── 3. TECHNICAL RELATED TO PORTAL SECTION ── */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#56348f] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div
                style={{
                  fontSize: "13px",
                  lineHeight: "20px",
                  fontWeight: 500,
                  color: "rgb(15, 24, 36)",
                }}
                className="dark:text-white truncate"
              >
                For Technical Related to Portal
              </div>
              <div
                style={{
                  fontSize: "12px",
                  lineHeight: "18px",
                  color: "rgb(94, 105, 120)",
                }}
                className="dark:text-slate-400 font-normal"
              >
                Abhiram P Mohan
              </div>
            </div>
          </div>

          <div className="pl-12 space-y-0.5">
            <a
              href="mailto:abhiram@intersmart.in"
              style={{
                fontSize: "13px",
                lineHeight: "20px",
                color: "#56348f",
              }}
              className="dark:text-purple-400 flex items-center gap-2 hover:underline transition-colors group cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#56348f] shrink-0" />
              <span className="font-medium truncate">abhiram@intersmart.in</span>
            </a>
            <a
              href="tel:7012649326"
              style={{
                fontSize: "13px",
                lineHeight: "20px",
                color: "rgb(15, 24, 36)",
              }}
              className="dark:text-slate-200 flex items-center gap-2 hover:text-[#56348f] dark:hover:text-purple-300 transition-colors group cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#56348f] shrink-0" />
              <span className="font-normal">7012649326</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
