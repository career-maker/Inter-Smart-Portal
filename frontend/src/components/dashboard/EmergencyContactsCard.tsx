"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Phone, Mail, LifeBuoy, Settings2 } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import emergencyContactsApi, { EmergencyContact } from "@/services/emergencyContacts";

const DEFAULT_FALLBACK_CONTACTS: EmergencyContact[] = [
  {
    id: 1,
    name: "Sahad, Nobby",
    role: "Team HR",
    email: "hr@intersmart.in",
    phone: null,
    department: "HR",
    avatar_bg: "bg-rose-500",
    initials: "HR",
    order: 1,
  },
  {
    id: 2,
    name: "Manu K O",
    role: "Lead PHP Developer",
    email: "manu@intersmart.in",
    phone: null,
    department: "Development",
    avatar_bg: "bg-indigo-500",
    initials: "MK",
    order: 2,
  },
  {
    id: 3,
    name: "Vishal Ramesh",
    role: "Lead UI/UX Developer",
    email: "vishal@intersmart.in",
    phone: null,
    department: "Design",
    avatar_bg: "bg-sky-500",
    initials: "VR",
    order: 3,
  },
  {
    id: 4,
    name: "Abhiram P Mohan",
    role: "Technical Support / Portal Helpdesk",
    email: "abhiram@intersmart.in",
    phone: null,
    department: "Technical",
    avatar_bg: "bg-[#56348f]",
    initials: "AP",
    order: 4,
  },
];

export function EmergencyContactsCard({
  title = "Emergency Contacts",
  subtitle = "We're here to assist you",
}: {
  title?: string;
  subtitle?: string;
}) {
  const { user } = useAuthStore();
  const userRoleStr = (user?.role || "").toLowerCase();
  const isSuperAdmin = userRoleStr === "super admin";

  const [contacts, setContacts] = useState<EmergencyContact[]>(DEFAULT_FALLBACK_CONTACTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchContacts = async () => {
      try {
        const res = await emergencyContactsApi.getContacts();
        if (isMounted && res.contacts && res.contacts.length > 0) {
          setContacts(res.contacts);
        }
      } catch (err) {
        console.warn("Using fallback emergency contacts due to API notice:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchContacts();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      style={{
        fontFamily:
          '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="bg-white dark:bg-slate-800 rounded-md p-5 sm:p-6 border border-slate-200/90 dark:border-slate-700/60 shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
    >
      {/* Card Header matching exact Keka typography */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2
            style={{
              fontFamily: '"Proxima Nova", sans-serif',
              fontSize: "13px",
              lineHeight: "20px",
              fontWeight: 500,
              color: "rgb(15, 24, 36)",
            }}
            className="dark:text-white flex items-center gap-2 box-title"
          >
            <LifeBuoy className="w-4 h-4 text-[#56348f] dark:text-purple-400 shrink-0" />
            <span>{title}</span>
          </h2>

          {isSuperAdmin && (
            <Link
              href="/project-management/addons/emergency-contacts"
              title="Manage Emergency Contacts (Super Admin)"
              className="p-1 rounded-md text-slate-400 hover:text-[#56348f] dark:hover:text-purple-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </Link>
          )}
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

      <style>{`
        .emergency-contacts-scroll {
          scrollbar-width: thin !important;
          scrollbar-color: rgba(148, 163, 184, 0.35) transparent !important;
        }
        .emergency-contacts-scroll::-webkit-scrollbar {
          width: 3.5px !important;
        }
        .emergency-contacts-scroll::-webkit-scrollbar-track {
          background: transparent !important;
        }
        .emergency-contacts-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.35) !important;
          border-radius: 9999px !important;
        }
        .emergency-contacts-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(86, 52, 143, 0.6) !important;
        }
      `}</style>

      {/* Scrollable Dynamic Contacts List */}
      <div className="space-y-3 max-h-[210px] overflow-y-auto pr-1.5 emergency-contacts-scroll">
        {contacts.map((contact, index) => {
          const isLast = index === contacts.length - 1;
          const avatarClass = contact.avatar_bg || "bg-indigo-500";

          return (
            <div
              key={contact.id}
              className={`space-y-1.5 pb-3.5 ${
                !isLast ? "border-b border-slate-100 dark:border-slate-700/50" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${avatarClass} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                >
                  {contact.initials || "EC"}
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
                    {contact.name}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      lineHeight: "18px",
                      color: "rgb(94, 105, 120)",
                    }}
                    className="dark:text-slate-400 font-normal truncate"
                  >
                    {contact.role}
                  </div>
                </div>
              </div>

              <div className="pl-12 space-y-0.5">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    style={{
                      fontSize: "13px",
                      lineHeight: "20px",
                      color: "#56348f",
                    }}
                    className="dark:text-purple-400 flex items-center gap-2 hover:underline transition-colors group cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#56348f] shrink-0" />
                    <span className="font-medium truncate">{contact.email}</span>
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    style={{
                      fontSize: "13px",
                      lineHeight: "20px",
                      color: "rgb(15, 24, 36)",
                    }}
                    className="dark:text-slate-200 flex items-center gap-2 hover:text-[#56348f] dark:hover:text-purple-300 transition-colors group cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#56348f] shrink-0" />
                    <span className="font-normal">{contact.phone}</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default EmergencyContactsCard;
