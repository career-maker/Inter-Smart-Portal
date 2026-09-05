"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Phone, Mail, LifeBuoy, ChevronRight, UserPlus } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import emergencyContactsApi, { EmergencyContact } from "@/services/emergencyContacts";

export function EmergencyContactsCard({
  title = "Emergency Contacts",
  subtitle = "We're here to assist you",
  className = "",
}: {
  title?: string;
  subtitle?: string;
  className?: string;
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

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchContacts = async () => {
      try {
        setLoading(true);
        const res = await emergencyContactsApi.getContacts();
        if (isMounted) {
          setContacts(Array.isArray(res?.contacts) ? res.contacts : []);
        }
      } catch (err) {
        console.error("Failed to load emergency contacts:", err);
        if (isMounted) {
          setContacts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
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
      className={`bg-white dark:bg-slate-800 rounded-md p-5 sm:p-6 border border-slate-200/90 dark:border-slate-700/60 shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${className}`}
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
            <span className="flex items-center gap-1.5">
              <span>{title}</span>
              {contacts.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300">
                  {contacts.length}
                </span>
              )}
            </span>
          </h2>
          {isSuperAdmin && (
            <Link
              href="/employees"
              title="Manage employees and assign emergency contacts"
              className="text-[11px] font-semibold text-[#56348f] dark:text-purple-400 hover:underline flex items-center gap-0.5"
            >
              <span>Manage</span>
              <ChevronRight className="w-3 h-3" />
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

      {/* Loading state */}
      {loading && (
        <div className="space-y-3 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-28" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State - No Emergency Contacts assigned */}
      {!loading && contacts.length === 0 && (
        <div className="py-6 px-4 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-900/30 my-1">
          <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#56348f] dark:text-purple-400 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            No emergency contacts assigned
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Emergency contacts will appear here once assigned by administrators.
          </p>
          {isSuperAdmin && (
            <div className="mt-3">
              <Link
                href="/employees"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#56348f] text-white hover:bg-[#452875] transition-colors shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Assign in Employee Management</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Assigned Contacts List - Displays all assigned employees with smooth internal scrolling */}
      {!loading && contacts.length > 0 && (
        <div className="flex-1 max-h-[220px] sm:max-h-[240px] overflow-y-auto pr-2 -mr-1 space-y-3 divide-y divide-slate-100 dark:divide-slate-700/50 scrollbar-thin [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
          {contacts.map((contact, index) => {
            const avatarClass = contact.avatar_bg || "bg-[#56348f]";

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
                    <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40 shrink-0">
                      {contact.department}
                    </span>
                  )}
                </div>

                {/* Contact channels with direct email and phone links */}
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
                      <span className="font-medium truncate max-w-[200px] sm:max-w-none">
                        {contact.email}
                      </span>
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
      )}
    </div>
  );
}

export default EmergencyContactsCard;
