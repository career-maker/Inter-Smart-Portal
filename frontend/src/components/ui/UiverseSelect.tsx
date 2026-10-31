"use client";

import { SelectCompat } from "@/components/ui/SelectCompat";
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";

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
 * Drop-in replacement for native <SelectCompat>.
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
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number; up: boolean; inline: boolean } | null>(null);

  // The panel is drawn in <body> at a fixed position, so tables, cards and dialogs with overflow never clip it.
  const place = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 260 && r.top > 260;
    // inside a modal dialog the panel stays in place: a dialog treats a click outside itself as "close"
    const inline = !!el.closest('[role="dialog"],[data-slot="dialog-content"],[data-slot="sheet-content"]');
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left: r.left, minWidth: r.width, up, inline });
  }, []);
  useLayoutEffect(() => {
    if (!isOpen) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [isOpen, place]);

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
      const t = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(t) && !(panelRef.current && panelRef.current.contains(t))) {
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
        className={`selected flex items-center justify-between gap-2.5 px-3 rounded-[9px] border transition-all duration-200 ${isOpen ? "is-open" : ""} ${
          size === "sm" ? "py-1 text-xs min-h-[32px]" : "py-2 text-xs sm:text-sm min-h-[38px]"
        } ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
            : isOpen
            ? "bg-white dark:bg-[#1e293b] border-[var(--portal-primary-color,#00BDA1)] ring-2 ring-[var(--portal-primary-color,#00BDA1)]/20 shadow-md cursor-pointer text-slate-900 dark:text-white"
            : "bg-white hover:bg-slate-50 dark:bg-[#1e293b] dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 hover:border-[var(--portal-primary-color,#00BDA1)] text-slate-800 dark:text-slate-100 cursor-pointer shadow-xs"
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
            isOpen ? "rotate-0 text-[var(--portal-primary-color,#00BDA1)]" : "-rotate-90 text-slate-400 dark:text-slate-500"
          }`}
          fill="currentColor"
        >
          <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" />
        </svg>
      </div>

      {/* Options Panel (From Uiverse.io by 3bdel3ziz-T) */}
      {isOpen && pos && typeof document !== "undefined" && (pos.inline ? (x: React.ReactNode) => x : (x: React.ReactNode) => createPortal(x, document.body))(
        <div
          ref={panelRef}
          style={pos.inline
            ? { fontFamily: 'var(--portal-font-family, "Proxima Nova", sans-serif)', position: "absolute", left: 0, minWidth: "100%", zIndex: 100000, ...(pos.up ? { bottom: "100%", marginBottom: 6 } : { top: "100%", marginTop: 6 }) }
            : { fontFamily: 'var(--portal-font-family, "Proxima Nova", sans-serif)', position: "fixed", left: pos.left, minWidth: pos.minWidth, zIndex: 100000, pointerEvents: "auto",
                ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
          className={`options is-open !opacity-100 !pointer-events-auto w-max max-w-xs sm:max-w-sm rounded-[12px] p-1.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 shadow-xl flex flex-col transition-all duration-150 animate-in fade-in-50 zoom-in-95 before:absolute before:-top-2 before:left-0 before:right-0 before:h-2 before:content-['']`}
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
                className="w-full px-2.5 py-1 text-xs rounded-[4px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-[var(--portal-primary-color,#00BDA1)] focus:ring-1 focus:ring-[var(--portal-primary-color,#00BDA1)]"
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
                    className={`option px-3 py-1.5 rounded-[8px] text-xs sm:text-sm cursor-pointer transition-all duration-300 flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-[var(--portal-primary-color,#00BDA1)]/15 text-[var(--portal-primary-color,#00BDA1)] font-semibold"
                        : "text-slate-700 dark:text-slate-200 hover:bg-[var(--portal-primary-color,#00BDA1)]/10 hover:text-[var(--portal-primary-color,#00BDA1)] dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <span className="text-[var(--portal-primary-color,#00BDA1)] font-bold text-xs shrink-0">
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
