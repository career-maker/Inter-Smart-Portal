"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";

export interface UiverseSelectOption {
  value: string | number;
  label: React.ReactNode;
}

export interface UiverseSelectProps {
  value: string | number | undefined | null;
  onChange: (value: any) => void;
  options?: UiverseSelectOption[];
  children?: React.ReactNode;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  size?: "sm" | "default" | "md";
  searchable?: boolean;
  align?: "left" | "right";
}

/**
 * Uiverse.io Dropdown Component (by 3bdel3ziz-T)
 * Styled with Portal Theme Colors & Dynamic Typography.
 * Drop-in replacement for native <select>.
 */
export function UiverseSelect({
  value,
  onChange,
  options,
  children,
  placeholder = "Select...",
  className = "",
  triggerClassName = "",
  disabled = false,
  style,
  size = "default",
  searchable = false,
  align = "left",
}: UiverseSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse options either from options prop or from <option> children
  const parsedOptions: UiverseSelectOption[] = useMemo(() => {
    if (options && options.length > 0) return options;
    const items: UiverseSelectOption[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const props = child.props as any;
        const optValue = props.value !== undefined ? props.value : "";
        const optLabel = props.children !== undefined ? props.children : String(optValue);
        items.push({ value: optValue, label: optLabel });
      }
    });
    return items;
  }, [options, children]);

  // Find currently selected label
  const selectedOption = useMemo(() => {
    return parsedOptions.find((opt) => String(opt.value) === String(value ?? ""));
  }, [parsedOptions, value]);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return parsedOptions;
    const term = searchTerm.toLowerCase();
    return parsedOptions.filter((opt) => {
      const text = typeof opt.label === "string" ? opt.label : String(opt.value);
      return text.toLowerCase().includes(term);
    });
  }, [parsedOptions, searchTerm]);

  const isAutoSearchable = searchable || parsedOptions.length > 10;

  return (
    <div
      ref={containerRef}
      style={style}
      className={`uiverse-select select relative inline-block text-left select-none ${isOpen ? "is-open z-[60]" : "z-10"} ${className}`}
    >
      {/* Selected Box Trigger (From Uiverse.io by 3bdel3ziz-T) */}
      <div
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        style={{
          fontFamily: 'var(--portal-font-family, "Proxima Nova", sans-serif)',
        }}
        className={`selected flex items-center justify-between gap-2.5 px-3 rounded-[6px] border transition-all duration-300 ${isOpen ? "is-open" : ""} ${
          size === "sm" ? "py-1 text-xs min-h-[32px]" : "py-2 text-xs sm:text-sm min-h-[38px]"
        } ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
            : isOpen
            ? "bg-white dark:bg-[#1e293b] border-[var(--portal-primary-color,#2563EB)] ring-2 ring-[var(--portal-primary-color,#2563EB)]/20 shadow-md cursor-pointer text-slate-900 dark:text-white"
            : "bg-white hover:bg-slate-50 dark:bg-[#1e293b] dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 hover:border-[var(--portal-primary-color,#2563EB)] text-slate-800 dark:text-slate-100 cursor-pointer shadow-xs"
        } ${triggerClassName}`}
      >
        <span className="truncate font-medium flex-1">
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        {/* Uiverse.io Chevron Arrow with 300ms rotation */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          className={`arrow shrink-0 w-3 h-3 transition-transform duration-300 ${
            isOpen ? "rotate-0 text-[var(--portal-primary-color,#2563EB)]" : "-rotate-90 text-slate-400 dark:text-slate-500"
          }`}
          fill="currentColor"
        >
          <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" />
        </svg>
      </div>

      {/* Options Panel (From Uiverse.io by 3bdel3ziz-T) */}
      {isOpen && (
        <div
          style={{
            fontFamily: 'var(--portal-font-family, "Proxima Nova", sans-serif)',
          }}
          className={`options is-open !opacity-100 !pointer-events-auto absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-1.5 z-50 min-w-full w-max max-w-xs sm:max-w-sm rounded-[6px] p-1 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 shadow-xl flex flex-col transition-all duration-150 animate-in fade-in-50 zoom-in-95 before:absolute before:-top-2 before:left-0 before:right-0 before:h-2 before:content-['']`}
        >
          {/* Quick Search if more than 10 options */}
          {isAutoSearchable && (
            <div className="p-1.5 border-b border-slate-100 dark:border-slate-800">
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-2.5 py-1 text-xs rounded-[4px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-[var(--portal-primary-color,#2563EB)] focus:ring-1 focus:ring-[var(--portal-primary-color,#2563EB)]"
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-0.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">No options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value ?? "");
                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`option px-3 py-1.5 rounded-[5px] text-xs sm:text-sm cursor-pointer transition-all duration-300 flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-[var(--portal-primary-color,#2563EB)]/15 text-[var(--portal-primary-color,#2563EB)] font-semibold"
                        : "text-slate-700 dark:text-slate-200 hover:bg-[var(--portal-primary-color,#2563EB)]/10 hover:text-[var(--portal-primary-color,#2563EB)] dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <span className="text-[var(--portal-primary-color,#2563EB)] font-bold text-xs shrink-0">
                        ✓
                      </span>
                    )}
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

export default UiverseSelect;
