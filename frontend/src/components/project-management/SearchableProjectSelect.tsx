"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, FolderKanban, X, Link2 } from "lucide-react";
import { Project } from "@/types/pm";

interface SearchableProjectSelectProps {
  projects: Project[];
  value: number | null | "";
  onChange: (value: number | "") => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function SearchableProjectSelect({
  projects,
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = "Search and select target project...",
  className = "",
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
    if (!value) return null;
    return projects.find((p) => p.id === Number(value)) || null;
  }, [projects, value]);

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return projects.filter((p) => {
      const combined = `${p.name} ${p.team?.name || ""} ${p.category || ""}`.toLowerCase();
      return searchTerms.every((term) => combined.includes(term));
    });
  }, [projects, searchTerm]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
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
        className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
          disabled
            ? "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-75"
            : isOpen
            ? "bg-white dark:bg-slate-800 border-[#56348f] ring-2 ring-[#56348f]/20 shadow-md text-slate-900 dark:text-white"
            : "bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-xs"
        }`}
      >
        <div className="flex items-center gap-2.5 truncate flex-1">
          <div className="p-1.5 rounded-lg bg-[#56348f]/10 text-[#56348f] dark:bg-[#56348f]/30 dark:text-purple-300 border border-[#56348f]/20 shrink-0">
            <FolderKanban className="w-3.5 h-3.5" />
          </div>
          {selectedProject ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                {selectedProject.name}
              </span>
              {selectedProject.team?.name && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shrink-0">
                  {selectedProject.team.name}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-500 dark:text-slate-400 italic text-xs">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
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

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 flex flex-col max-h-72 ring-1 ring-black/5">
          {/* Live Search Input */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#56348f]/20 focus:border-[#56348f]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{filteredProjects.length} projects found</span>
              {selectedProject && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                  className="text-rose-500 hover:underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* Project Options List */}
          <div className="overflow-y-auto p-1.5 space-y-1">
            {filteredProjects.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                <FolderKanban className="w-6 h-6 mx-auto mb-1.5 text-slate-300 dark:text-slate-600" />
                No matching projects found
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isSelected = value === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onChange(p.id);
                      setIsOpen(false);
                    }}
                    className={`px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors duration-150 ${
                      isSelected
                        ? "bg-[#56348f] text-white shadow-md shadow-[#56348f]/20 font-semibold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <FolderKanban className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
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
                        <div className="flex items-center gap-2 mt-0.5 text-[10px]">
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
