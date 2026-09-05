"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Phone, Mail, LifeBuoy, Edit2, ChevronRight, ExternalLink } from "lucide-react";
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
  const isSuperAdmin =
    userRoleStr.includes("super admin") ||
    userRoleStr === "admin" ||
    (Array.isArray((user as any)?.roles) &&
      (user as any).roles.some(
        (r: any) =>
          typeof r === "string" &&
          (r.toLowerCase().includes("admin") || r.toLowerCase().includes("super"))
      ));

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
      {/* Card Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
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
              title="Edit & Manage Emergency Contacts (Super Admin)"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#56348f] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-lg border border-purple-200 dark:border-purple-800/60 transition-colors shadow-2xs group"
            >
              <Edit2 className="w-3 h-3 group-hover:scale-110 transition-transform" />
              <span>Edit</span>
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

      {/* Dynamic Contacts List - Displays all names and contact links cleanly without cut-off */}
      <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-700/50">
        {contacts.map((contact, index) => {
          const avatarClass = contact.avatar_bg || "bg-indigo-500";

          return (
            <div
              key={contact.id || index}
              className={`space-y-1.5 ${index > 0 ? "pt-3" : "pt-0"} pb-1`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
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
                      className="dark:text-white truncate font-medium"
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

                {contact.department && (
                  <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 shrink-0">
                    {contact.department}
                  </span>
                )}
              </div>

              {/* Contact channels with direct links */}
              <div className="pl-12 flex flex-wrap items-center gap-x-4 gap-y-1">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    style={{
                      fontSize: "13px",
                      lineHeight: "20px",
                      color: "#56348f",
                    }}
                    title={`Email ${contact.name}`}
                    className="dark:text-purple-400 inline-flex items-center gap-1.5 hover:underline transition-colors group cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#56348f] shrink-0" />
                    <span className="font-medium truncate max-w-[200px] sm:max-w-none">{contact.email}</span>
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
                    title={`Call ${contact.name}`}
                    className="dark:text-slate-200 inline-flex items-center gap-1.5 hover:text-[#56348f] dark:hover:text-purple-300 transition-colors group cursor-pointer"
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

      {/* Footer link for Super Admin */}
      {isSuperAdmin && (
        <div className="pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">Super Admin Options</span>
          <Link
            href="/project-management/addons/emergency-contacts"
            className="font-semibold text-[#56348f] dark:text-purple-400 hover:underline flex items-center gap-1 group"
          >
            <span>Manage Contacts</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default EmergencyContactsCard;
