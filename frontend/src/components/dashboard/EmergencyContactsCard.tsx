"use client";

import React from "react";
import { Phone, Mail, LifeBuoy } from "lucide-react";

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatarBg: string;
  phone?: string;
  email: string;
}

const DEFAULT_CONTACTS: EmergencyContact[] = [
  {
    id: "1",
    name: "Jayant Jhamani",
    role: "Associate - IT & Systems",
    initials: "JJ",
    avatarBg: "bg-amber-500",
    phone: "8697873749",
    email: "jj@gm.com",
  },
  {
    id: "2",
    name: "Aditya Bhattacharjee",
    role: "Product Sales Consultant",
    initials: "AB",
    avatarBg: "bg-sky-500",
    phone: "8697873749",
    email: "adityabhattacharjee367@gmail.com",
  },
  {
    id: "3",
    name: "HR Operations Desk",
    role: "HR & Employee Relations",
    initials: "HR",
    avatarBg: "bg-emerald-500",
    phone: "+91 484 295 5600",
    email: "hr@intersmart.in",
  },
];

export function EmergencyContactsCard({
  title = "Emergency Contacts",
  subtitle = "We're here to assist you",
}: {
  title?: string;
  subtitle?: string;
}) {
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
              fontWeight: 600,
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
        {DEFAULT_CONTACTS.map((contact, idx) => (
          <div
            key={contact.id}
            className={`space-y-2 pb-3.5 ${
              idx !== DEFAULT_CONTACTS.length - 1
                ? "border-b border-slate-100 dark:border-slate-700/50"
                : ""
            }`}
          >
            {/* Contact Avatar + Name + Role */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full ${contact.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm`}
              >
                {contact.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  style={{
                    fontSize: "13px",
                    lineHeight: "20px",
                    fontWeight: 600,
                    color: "rgb(15, 24, 36)",
                  }}
                  className="dark:text-white hover:text-[#56348f] dark:hover:text-purple-400 transition-colors truncate"
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

            {/* Contact Details (Phone & Email) */}
            <div className="pl-13 space-y-1">
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
