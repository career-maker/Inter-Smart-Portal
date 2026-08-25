"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, User, Check, X } from "lucide-react";

export interface CoordinatorOption {
  id: number;
  first_name: string;
  last_name: string;
  employee_code?: string;
  department?: string;
}

interface SearchableCoordinatorSelectProps {
  value: number | null;
  onChange: (id: number | null) => void;
  coordinators: CoordinatorOption[];
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableCoordinatorSelect({
  value,
  onChange,
  coordinators,
  placeholder = "Unassigned",
  disabled = false,
}: SearchableCoordinatorSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Selected item object
  const selectedCoordinator = useMemo(() => {
    if (!value) return null;
    return coordinators.find((c) => c.id === value) || null;
  }, [value, coordinators]);

  // Filtered coordinators list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coordinators;
    return coordinators.filter((c) => {
      const fullName = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
      const code = (c.employee_code || "").toLowerCase();
      const dept = (c.department || "").toLowerCase();
      return fullName.includes(q) || code.includes(q) || dept.includes(q);
    });
  }, [coordinators, search]);

  const handleSelect = (id: number | null) => {
    onChange(id);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border text-left text-sm flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          <User className="w-4 h-4 text-slate-400 shrink-0" />
          {selectedCoordinator ? (
            <span className="text-slate-900 dark:text-white font-medium truncate">
              {selectedCoordinator.first_name} {selectedCoordinator.last_name}
              {selectedCoordinator.employee_code && (
                <span className="text-slate-400 font-normal text-xs ml-1">
                  ({selectedCoordinator.employee_code})
                </span>
              )}
              <span className="text-xs text-blue-600 dark:text-blue-400 font-normal ml-1.5">
                • {selectedCoordinator.department || "General"}
              </span>
            </span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400 text-sm">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selectedCoordinator && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(null);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
              title="Clear coordinator"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-500" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Search Bar */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search coordinator by name, code or department..."
                className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {/* Unassigned / None option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full text-left px-3.5 py-2 flex items-center justify-between text-xs transition-colors ${
                !value
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 font-semibold"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>— Unassigned / No Coordinator —</span>
              {!value && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
            </button>

            {/* List of coordinators */}
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                No employees matching &ldquo;{search}&rdquo;
              </div>
            ) : (
              filtered.map((c) => {
                const isSelected = value === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => handleSelect(c.id)}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between text-xs transition-colors ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold"
                        : "hover:bg-slate-100/60 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate font-medium">
                        {c.first_name} {c.last_name}
                        {c.employee_code && (
                          <span className="text-slate-400 font-normal ml-1 text-[11px]">
                            ({c.employee_code})
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                        {c.department || "General"}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer count indicator */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>
              Showing {filtered.length} of {coordinators.length} employees
            </span>
            {search && (
              <span className="text-blue-500 font-medium">Filtered</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
