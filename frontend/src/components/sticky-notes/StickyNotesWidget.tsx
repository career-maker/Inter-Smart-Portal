"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pin,
  Plus,
  Trash2,
  X,
  RotateCcw,
  Check,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { stickyNotesService, StickyNote } from "@/services/stickyNotes";
import { useStickyNotesStore } from "@/store/stickyNotesStore";
import { cn } from "@/lib/utils";

// Authentic macOS Stickies Pastel Color Themes
const MACOS_PALETTES = {
  amber: {
    name: "Classic Yellow",
    bg: "bg-[#fff9c4]",
    headerBg: "bg-[#fff59d]/80",
    border: "border-[#fbc02d]/40",
    text: "text-[#423a10]",
    textarea: "bg-transparent text-[#3e2723] placeholder-[#8d6e63]/60",
    dot: "bg-[#fbc02d]",
    statusText: "text-[#795548]",
  },
  emerald: {
    name: "Mint Green",
    bg: "bg-[#e8f5e9]",
    headerBg: "bg-[#c8e6c9]/80",
    border: "border-[#81c784]/40",
    text: "text-[#1b5e20]",
    textarea: "bg-transparent text-[#1b5e20] placeholder-[#4caf50]/60",
    dot: "bg-[#81c784]",
    statusText: "text-[#2e7d32]",
  },
  sky: {
    name: "Sky Blue",
    bg: "bg-[#e1f5fe]",
    headerBg: "bg-[#b3e5fc]/80",
    border: "border-[#4fc3f7]/40",
    text: "text-[#01579b]",
    textarea: "bg-transparent text-[#01579b] placeholder-[#03a9f4]/60",
    dot: "bg-[#4fc3f7]",
    statusText: "text-[#0277bd]",
  },
  rose: {
    name: "Pastel Pink",
    bg: "bg-[#fce4ec]",
    headerBg: "bg-[#f8bbd0]/80",
    border: "border-[#f06292]/40",
    text: "text-[#880e4f]",
    textarea: "bg-transparent text-[#880e4f] placeholder-[#ec407a]/60",
    dot: "bg-[#f06292]",
    statusText: "text-[#ad1457]",
  },
  purple: {
    name: "Lilac Purple",
    bg: "bg-[#f3e5f5]",
    headerBg: "bg-[#e1bee7]/80",
    border: "border-[#ba68c8]/40",
    text: "text-[#4a148c]",
    textarea: "bg-transparent text-[#4a148c] placeholder-[#ab47bc]/60",
    dot: "bg-[#ba68c8]",
    statusText: "text-[#6a1b9a]",
  },
  slate: {
    name: "Silver Gray",
    bg: "bg-[#eceff1]",
    headerBg: "bg-[#cfd8dc]/80",
    border: "border-[#90a4ae]/40",
    text: "text-[#263238]",
    textarea: "bg-transparent text-[#263238] placeholder-[#78909c]/60",
    dot: "bg-[#90a4ae]",
    statusText: "text-[#455a64]",
  },
};

type PaletteKey = keyof typeof MACOS_PALETTES;
const LOCAL_STORAGE_KEY = "intersmart_macos_sticky_notes_v1";

export function StickyNotesWidget() {
  const { isOpen, closeStickyNotes, setNotesCount } = useStickyNotesStore();

  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>("Saved");

  // Active note fields
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftColor, setDraftColor] = useState<PaletteKey>("amber");
  const [draftPinned, setDraftPinned] = useState(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with LocalStorage helper
  const syncToLocalStorage = (updatedNotes: StickyNote[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedNotes));
    } catch (e) {
      // Ignore local storage quota limits
    }
  };

  // Load from local storage immediately, then fetch from API
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed: StickyNote[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotes(parsed);
          setNotesCount(parsed.length);
          selectNote(parsed[0]);
        }
      }
    } catch (e) {
      // Ignore parse error
    }

    // Load from backend
    loadFromBackend();
  }, []);

  const loadFromBackend = async () => {
    try {
      const backendNotes = await stickyNotesService.getNotes();
      if (backendNotes && backendNotes.length > 0) {
        setNotes(backendNotes);
        setNotesCount(backendNotes.length);
        syncToLocalStorage(backendNotes);
        if (!activeNoteId) {
          selectNote(backendNotes[0]);
        }
      }
    } catch (err) {
      console.warn("Backend sticky notes fetch error, using local notes:", err);
    }
  };

  const selectNote = (note: StickyNote) => {
    setActiveNoteId(note.id);
    setDraftTitle(note.title || "");
    setDraftContent(note.content || "");
    setDraftColor(
      (note.color as PaletteKey) in MACOS_PALETTES
        ? (note.color as PaletteKey)
        : "amber"
    );
    setDraftPinned(!!note.is_pinned);
    setSaveStatus("Saved");
  };

  // Create New macOS Sticky Note
  const handleCreateNote = async () => {
    const tempId = Date.now();
    const newNote: StickyNote = {
      id: tempId,
      user_id: 0,
      title: `Sticky Note #${notes.length + 1}`,
      content: "",
      color: "amber",
      is_pinned: false,
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    setNotesCount(updated.length);
    syncToLocalStorage(updated);
    selectNote(newNote);

    try {
      const created = await stickyNotesService.createNote({
        title: newNote.title,
        content: newNote.content,
        color: newNote.color,
        is_pinned: newNote.is_pinned,
      });
      if (created && created.id) {
        const finalNotes = updated.map((n) => (n.id === tempId ? created : n));
        setNotes(finalNotes);
        syncToLocalStorage(finalNotes);
        setActiveNoteId(created.id);
      }
    } catch (e) {
      // Kept in local storage safely!
    }
  };

  // Perform Save (Instant local update + asynchronous API sync)
  const performSave = useCallback(
    async (
      id: number,
      title: string,
      content: string,
      color: string,
      isPinned: boolean
    ) => {
      setIsSaving(true);
      setSaveStatus("Saving...");

      // 1. Immediately update local state & LocalStorage
      setNotes((prev) => {
        const next = prev.map((n) =>
          n.id === id
            ? {
                ...n,
                title,
                content,
                color,
                is_pinned: isPinned,
                updated_at: new Date().toISOString(),
              }
            : n
        );
        syncToLocalStorage(next);
        return next;
      });

      // 2. Asynchronously sync with Backend API
      try {
        await stickyNotesService.updateNote(id, {
          title,
          content,
          color,
          is_pinned: isPinned,
        });
        setSaveStatus("Saved");
      } catch (err) {
        // Even if backend call fails (e.g. pending migration), local storage saved it!
        setSaveStatus("Saved locally");
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Debounced auto-save
  const triggerAutoSave = (
    title: string,
    content: string,
    color: string,
    isPinned: boolean
  ) => {
    if (!activeNoteId) return;
    setSaveStatus("Editing...");
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      performSave(activeNoteId, title, content, color, isPinned);
    }, 600);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDraftTitle(val);
    triggerAutoSave(val, draftContent, draftColor, draftPinned);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraftContent(val);
    triggerAutoSave(draftTitle, val, draftColor, draftPinned);
  };

  const handleColorChange = (color: PaletteKey) => {
    setDraftColor(color);
    if (activeNoteId) {
      performSave(activeNoteId, draftTitle, draftContent, color, draftPinned);
    }
  };

  const handleTogglePin = () => {
    const newPinned = !draftPinned;
    setDraftPinned(newPinned);
    if (activeNoteId) {
      performSave(activeNoteId, draftTitle, draftContent, draftColor, newPinned);
    }
  };

  // Clear current note content
  const handleClearCurrentNote = () => {
    setDraftContent("");
    if (activeNoteId) {
      performSave(activeNoteId, draftTitle, "", draftColor, draftPinned);
    }
  };

  // Delete current note
  const handleDeleteActiveNote = async () => {
    if (!activeNoteId) return;
    const remaining = notes.filter((n) => n.id !== activeNoteId);
    setNotes(remaining);
    setNotesCount(remaining.length);
    syncToLocalStorage(remaining);

    const oldId = activeNoteId;
    if (remaining.length > 0) {
      selectNote(remaining[0]);
    } else {
      setActiveNoteId(null);
      setDraftTitle("");
      setDraftContent("");
    }

    try {
      await stickyNotesService.deleteNote(oldId);
    } catch (e) {
      // Handled
    }
  };

  if (!isOpen) return null;

  const activePalette = MACOS_PALETTES[draftColor] || MACOS_PALETTES.amber;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className={cn(
          "fixed top-18 sm:top-20 right-4 sm:right-10 z-[9999] w-[340px] sm:w-[390px] max-w-[calc(100vw-2rem)] rounded-xl overflow-hidden flex flex-col border shadow-[0_20px_60px_rgba(0,0,0,0.30)] backdrop-blur-xs transition-colors duration-200 font-sans select-none",
          activePalette.bg,
          activePalette.border
        )}
      >
        {/* ── macOS WINDOW TITLE BAR (Traffic Lights + Controls) ── */}
        <div
          className={cn(
            "h-9 px-3.5 flex items-center justify-between border-b cursor-grab active:cursor-grabbing shrink-0 transition-colors select-none",
            activePalette.headerBg,
            activePalette.border
          )}
        >
          {/* macOS Window Controls (Traffic Lights) */}
          <div className="flex items-center gap-2">
            {/* Red: Close */}
            <button
              onClick={closeStickyNotes}
              className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:opacity-80 transition cursor-pointer flex items-center justify-center group"
              title="Close Stickies (Esc)"
            >
              <X className="w-2 h-2 text-[#4d0000] opacity-0 group-hover:opacity-100" />
            </button>

            {/* Yellow: Collapse / Minimize */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:opacity-80 transition cursor-pointer flex items-center justify-center group"
              title={isCollapsed ? "Expand Stickie" : "Collapse Stickie"}
            >
              <span className="w-1.5 h-0.5 bg-[#593900] opacity-0 group-hover:opacity-100" />
            </button>

            {/* Green: Add New Note */}
            <button
              onClick={handleCreateNote}
              className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:opacity-80 transition cursor-pointer flex items-center justify-center group"
              title="New Sticky Note"
            >
              <Plus className="w-2 h-2 text-[#003d00] opacity-0 group-hover:opacity-100" />
            </button>
          </div>

          {/* Centered Title (Editable) */}
          <div className="flex-1 mx-3 text-center truncate">
            <input
              type="text"
              value={draftTitle}
              onChange={handleTitleChange}
              placeholder="Sticky Note..."
              className={cn(
                "w-full text-center bg-transparent border-none outline-none font-bold text-xs truncate focus:ring-0 select-text cursor-text",
                activePalette.text
              )}
            />
          </div>

          {/* Right Controls: Pin & Palette */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleTogglePin}
              className={cn(
                "p-1 rounded transition cursor-pointer",
                draftPinned ? "text-amber-700 font-bold" : "opacity-50 hover:opacity-100 text-slate-700"
              )}
              title={draftPinned ? "Unpin Note" : "Pin Note to Top"}
            >
              <Pin className={cn("w-3.5 h-3.5", draftPinned && "fill-current")} />
            </button>

            {notes.length > 1 && (
              <button
                onClick={handleDeleteActiveNote}
                className="p-1 rounded opacity-50 hover:opacity-100 text-rose-700 hover:text-rose-800 transition cursor-pointer"
                title="Delete this note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── EXPANDED BODY (Paper Area) ── */}
        {!isCollapsed && (
          <>
            {/* Multi-note Tab Switcher (if user has > 1 note) */}
            {notes.length > 1 && (
              <div
                className={cn(
                  "px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto border-b text-[11px] shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                  activePalette.headerBg,
                  activePalette.border
                )}
              >
                {notes.map((note) => {
                  const isActive = note.id === activeNoteId;
                  const pal = MACOS_PALETTES[(note.color as PaletteKey)] || MACOS_PALETTES.amber;
                  return (
                    <button
                      key={note.id}
                      onClick={() => selectNote(note)}
                      className={cn(
                        "px-2 py-0.5 rounded-md font-semibold truncate max-w-[90px] transition cursor-pointer flex items-center gap-1",
                        isActive
                          ? "bg-white/80 text-slate-900 shadow-2xs font-bold ring-1 ring-black/10"
                          : "opacity-60 hover:opacity-100 text-slate-800"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", pal.dot)} />
                      <span className="truncate">{note.title || "Note"}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Note Textarea */}
            <div className="p-4 flex-1 flex flex-col min-h-[200px] sm:min-h-[240px]">
              <textarea
                value={draftContent}
                onChange={handleContentChange}
                placeholder="Take a note, type reminders, paste links..."
                className={cn(
                  "w-full flex-1 resize-none border-none outline-none font-sans text-sm leading-relaxed select-text cursor-text",
                  activePalette.textarea
                )}
                autoFocus
              />
            </div>

            {/* ── BOTTOM macOS FOOTER (Color dots, clear, status) ── */}
            <div
              className={cn(
                "px-3.5 py-2 border-t flex items-center justify-between text-xs shrink-0 select-none",
                activePalette.headerBg,
                activePalette.border
              )}
            >
              {/* Color dots picker */}
              <div className="flex items-center gap-1.5">
                {(Object.keys(MACOS_PALETTES) as PaletteKey[]).map((key) => {
                  const pal = MACOS_PALETTES[key];
                  const isSelected = draftColor === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleColorChange(key)}
                      className={cn(
                        "w-3.5 h-3.5 rounded-full transition-transform cursor-pointer border border-black/15 shadow-2xs",
                        pal.dot,
                        isSelected ? "scale-125 ring-1 ring-slate-800 ring-offset-1" : "hover:scale-110 opacity-70 hover:opacity-100"
                      )}
                      title={pal.name}
                    />
                  );
                })}
              </div>

              {/* Status & Quick Clear */}
              <div className="flex items-center gap-2">
                <span className={cn("text-[10.5px] font-semibold", activePalette.statusText)}>
                  {isSaving ? "Saving..." : saveStatus}
                </span>

                {draftContent && (
                  <button
                    onClick={handleClearCurrentNote}
                    className="text-[10.5px] font-medium opacity-60 hover:opacity-100 underline transition cursor-pointer"
                    title="Clear content"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default StickyNotesWidget;
