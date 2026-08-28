"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, FolderKanban, X, Link2, Layers } from "lucide-react";
import { Project } from "@/types/pm";

interface SearchableProjectSelectProps {
  projects: Project[];
  value: number | null | string;
  onChange: (value: number | "") => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  allowAllOption?: boolean;
  allOptionLabel?: string;
  size?: "sm" | "md";
}

export function SearchableProjectSelect({
  projects,
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = "Search and select target project...",
  className = "",
  allowAllOption = false,
  allOptionLabel = "All Projects",
  size = "md",
}: SearchableProjectSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  const selectedProject = useMemo(() => {
    if (!value || value === "") return null;
    return projects.find((p) => String(p.id) === String(value)) || null;
  }, [projects, value]);

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return projects.filter((p) => {
      const combined = `${p.name} ${p.team?.name || ""} ${p.category || ""}`.toLowerCase();
      return searchTerms.every((term) => combined.includes(term));
    });
  }, [projects, searchTerm]);

  const isSmall = size === "sm";

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isOpen ? "z-[60]" : "z-10"} ${className}`}
      style={{ fontFamily: '"Proxima Nova", sans-serif' }}
    >
      {/* Hidden input for form requirement */}
      {required && (
        <input
          type="text"
          value={value ? String(value) : ""}
          required={required}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Select Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full text-left flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer rounded-xl border ${
          isSmall ? "px-3 py-2 text-xs" : "px-3.5 py-2.5 text-xs sm:text-sm"
        } ${
          disabled
            ? "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-75"
            : isOpen
            ? "bg-white dark:bg-slate-800 border-[#56348f] ring-2 ring-[#56348f]/20 shadow-md text-slate-900 dark:text-white"
            : "bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-xs"
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1">
          <div className="p-1 rounded-lg bg-[#56348f]/10 text-[#56348f] dark:bg-[#56348f]/30 dark:text-purple-300 border border-[#56348f]/20 shrink-0">
            <FolderKanban className="w-3.5 h-3.5" />
          </div>
          {selectedProject ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-slate-900 dark:text-white truncate text-xs">
                {selectedProject.name}
              </span>
              {selectedProject.team?.name && (
                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shrink-0">
                  {selectedProject.team.name}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-600 dark:text-slate-300 text-xs font-normal truncate">
              {allowAllOption ? allOptionLabel : placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-0.5 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#56348f] dark:text-purple-400" : ""
            }`}
          />
        </div>
      </button>

      {/* Floating Dropdown Panel - STRICTLY DOWNWARDS */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 top-full mt-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 flex flex-col max-h-80 ring-1 ring-black/5"
          style={{ width: "100%", minWidth: "260px" }}
        >
          {/* Live Search Input */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 sticky top-0 z-10 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search projects by name, team, or category..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#56348f]/20 focus:border-[#56348f]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{filteredProjects.length} project{filteredProjects.length === 1 ? "" : "s"} found</span>
              {selectedProject && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                  className="text-rose-500 hover:underline cursor-pointer font-medium"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* Project Options List */}
          <div className="overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
            {/* Optional "All Projects" row */}
            {allowAllOption && (
              <div
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors duration-150 ${
                  !value || value === ""
                    ? "bg-[#56348f] text-white shadow-xs font-semibold"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1 rounded-lg shrink-0 ${
                      !value || value === ""
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold">{allOptionLabel}</span>
                </div>
                {(!value || value === "") && <Check className="w-4 h-4 text-white shrink-0" />}
              </div>
            )}

            {filteredProjects.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
                <FolderKanban className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
                <p>No matching projects found</p>
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isSelected = String(value) === String(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onChange(p.id);
                      setIsOpen(false);
                    }}
                    className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors duration-150 ${
                      isSelected
                        ? "bg-[#56348f] text-white shadow-xs font-semibold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1">
                      <div
                        className={`p-1 rounded-lg shrink-0 ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <FolderKanban className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate text-left">
                        <div className="truncate font-semibold flex items-center gap-1.5">
                          <span className={isSelected ? "text-white" : "text-slate-900 dark:text-white"}>
                            {p.name}
                          </span>
                          {p.hubstaff_project_id && (
                            <span title="Linked to Hubstaff">
                              <Link2
                                className={`w-3 h-3 shrink-0 ${
                                  isSelected ? "text-white" : "text-sky-500"
                                }`}
                              />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          {p.team?.name && (
                            <span
                              className={`truncate ${
                                isSelected ? "text-purple-100" : "text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              • {p.team.name}
                            </span>
                          )}
                          {p.category && (
                            <span
                              className={`truncate ${
                                isSelected ? "text-purple-200" : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              ({p.category})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
