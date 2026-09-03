"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  StickyNote as StickyNoteIcon,
  Plus,
  Trash2,
  Pin,
  X,
  Check,
  RotateCcw,
  Loader2,
  Sparkles,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import {
  stickyNotesService,
  StickyNote,
} from "@/services/stickyNotes";
import { cn } from "@/lib/utils";

// Palette definitions for sticky notes
const NOTE_PALETTES = {
  amber: {
    name: "Yellow",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200/90 dark:border-amber-800/60",
    badge: "bg-amber-400 text-amber-950",
    headerBg: "bg-amber-100/70 dark:bg-amber-900/40",
    editorBg: "bg-amber-50/50 dark:bg-amber-950/20",
    text: "text-amber-950 dark:text-amber-100",
    accent: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  emerald: {
    name: "Green",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200/90 dark:border-emerald-800/60",
    badge: "bg-emerald-400 text-emerald-950",
    headerBg: "bg-emerald-100/70 dark:bg-emerald-900/40",
    editorBg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    text: "text-emerald-950 dark:text-emerald-100",
    accent: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-400",
  },
  sky: {
    name: "Blue",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-200/90 dark:border-sky-800/60",
    badge: "bg-sky-400 text-sky-950",
    headerBg: "bg-sky-100/70 dark:bg-sky-900/40",
    editorBg: "bg-sky-50/50 dark:bg-sky-950/20",
    text: "text-sky-950 dark:text-sky-100",
    accent: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-400",
  },
  rose: {
    name: "Pink",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200/90 dark:border-rose-800/60",
    badge: "bg-rose-400 text-rose-950",
    headerBg: "bg-rose-100/70 dark:bg-rose-900/40",
    editorBg: "bg-rose-50/50 dark:bg-rose-950/20",
    text: "text-rose-950 dark:text-rose-100",
    accent: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-400",
  },
  purple: {
    name: "Purple",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200/90 dark:border-purple-800/60",
    badge: "bg-purple-400 text-purple-950",
    headerBg: "bg-purple-100/70 dark:bg-purple-900/40",
    editorBg: "bg-purple-50/50 dark:bg-purple-950/20",
    text: "text-purple-950 dark:text-purple-100",
    accent: "text-purple-600 dark:text-purple-400",
    dot: "bg-purple-400",
  },
  slate: {
    name: "Slate",
    bg: "bg-slate-50 dark:bg-slate-900/60",
    border: "border-slate-200/90 dark:border-slate-800/80",
    badge: "bg-slate-400 text-slate-950",
    headerBg: "bg-slate-100/80 dark:bg-slate-800/50",
    editorBg: "bg-slate-50/50 dark:bg-slate-900/30",
    text: "text-slate-900 dark:text-slate-100",
    accent: "text-slate-600 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

type PaletteKey = keyof typeof NOTE_PALETTES;

export function StickyNotesWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Active note draft states for instant feedback
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftColor, setDraftColor] = useState<PaletteKey>("amber");
  const [draftPinned, setDraftPinned] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const data = await stickyNotesService.getNotes();
      setNotes(data);
      if (data.length > 0 && !activeNoteId) {
        selectNote(data[0]);
      }
    } catch (err) {
      console.error("Failed to load sticky notes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectNote = (note: StickyNote) => {
    setActiveNoteId(note.id);
    setDraftTitle(note.title || "");
    setDraftContent(note.content || "");
    setDraftColor((note.color as PaletteKey) in NOTE_PALETTES ? (note.color as PaletteKey) : "amber");
    setDraftPinned(!!note.is_pinned);
    setLastSavedTime("Saved");
  };

  // Create a new note
  const handleCreateNote = async () => {
    try {
      setIsSaving(true);
      const newNote = await stickyNotesService.createNote({
        title: `Note #${notes.length + 1}`,
        content: "",
        color: "amber",
        is_pinned: false,
      });
      const updatedNotes = [newNote, ...notes];
      setNotes(updatedNotes);
      selectNote(newNote);
    } catch (err) {
      console.error("Failed to create note:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Perform Save
  const performSave = useCallback(
    async (
      id: number,
      title: string,
      content: string,
      color: string,
      isPinned: boolean
    ) => {
      try {
        setIsSaving(true);
        const updated = await stickyNotesService.updateNote(id, {
          title,
          content,
          color,
          is_pinned: isPinned,
        });
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? updated : n))
        );
        setLastSavedTime("Saved just now");
      } catch (err) {
        console.error("Failed to update note:", err);
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Debounced auto-save on typing
  const triggerAutoSave = (
    title: string,
    content: string,
    color: string,
    isPinned: boolean
  ) => {
    if (!activeNoteId) return;
    setLastSavedTime("Unsaved changes...");
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      performSave(activeNoteId, title, content, color, isPinned);
    }, 800);
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

  // Clear current active note content
  const handleClearCurrentNote = () => {
    setDraftContent("");
    if (activeNoteId) {
      performSave(activeNoteId, draftTitle, "", draftColor, draftPinned);
    }
  };

  // Delete active note
  const handleDeleteActiveNote = async () => {
    if (!activeNoteId) return;
    try {
      setIsSaving(true);
      await stickyNotesService.deleteNote(activeNoteId);
      const remaining = notes.filter((n) => n.id !== activeNoteId);
      setNotes(remaining);
      if (remaining.length > 0) {
        selectNote(remaining[0]);
      } else {
        setActiveNoteId(null);
        setDraftTitle("");
        setDraftContent("");
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Clear all notes
  const handleClearAll = async () => {
    try {
      setIsSaving(true);
      await stickyNotesService.clearAllNotes();
      setNotes([]);
      setActiveNoteId(null);
      setDraftTitle("");
      setDraftContent("");
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Failed to clear notes:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const activePalette = NOTE_PALETTES[draftColor] || NOTE_PALETTES.amber;

  return (
    <>
      {/* ── FLOATING BUTTON (Bottom Right) ── */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          onClick={() => {
            if (!isOpen && notes.length === 0) {
              handleCreateNote();
            }
            setIsOpen(!isOpen);
          }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "relative flex items-center justify-center w-14 h-14 rounded-2xl shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 cursor-pointer",
            isOpen
              ? "bg-amber-600 text-white shadow-amber-600/30 focus:ring-amber-500/30"
              : "bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white shadow-amber-500/25 hover:shadow-amber-500/40 focus:ring-amber-400/40"
          )}
          aria-label="Toggle Sticky Notes"
          title="Sticky Notes"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform" />
          ) : (
            <>
              <StickyNoteIcon className="w-6 h-6 transition-transform" />
              {notes.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 bg-rose-600 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 animate-in zoom-in">
                  {notes.length}
                </span>
              )}
            </>
          )}
        </motion.button>
      </div>

      {/* ── STICKY NOTE MODAL / POPUP ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.92 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={cn(
              "fixed bottom-24 right-6 z-50 w-[380px] sm:w-[430px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-8rem)] flex flex-col rounded-3xl shadow-2xl border backdrop-blur-xl overflow-hidden transition-colors duration-300",
              activePalette.bg,
              activePalette.border
            )}
          >
            {/* Header */}
            <div
              className={cn(
                "p-4 px-5 border-b flex items-center justify-between shrink-0 transition-colors",
                activePalette.headerBg,
                activePalette.border
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shadow-xs shrink-0",
                    activePalette.badge
                  )}
                >
                  <StickyNoteIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={cn("text-sm font-bold truncate", activePalette.text)}>
                      Sticky Notes
                    </h3>
                    <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      {notes.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {lastSavedTime || "Auto-saves automatically"}
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCreateNote}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Add New Note"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {notes.length > 0 && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Clear All Notes"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Clear All Confirmation Bar */}
            <AnimatePresence>
              {showClearConfirm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-500 text-white p-3 px-4 flex items-center justify-between text-xs font-semibold z-10 shrink-0"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Clear all {notes.length} notes?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClearAll}
                      className="px-2.5 py-1 bg-white text-rose-700 rounded-md font-bold hover:bg-rose-50 transition cursor-pointer"
                    >
                      Yes, Clear
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 rounded-md transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notes Tabs Strip (if multiple notes exist) */}
            {notes.length > 0 && (
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 overflow-x-auto border-b shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                  activePalette.headerBg,
                  activePalette.border
                )}
              >
                {notes.map((note) => {
                  const isActive = note.id === activeNoteId;
                  const palette = NOTE_PALETTES[(note.color as PaletteKey)] || NOTE_PALETTES.amber;
                  return (
                    <button
                      key={note.id}
                      onClick={() => selectNote(note)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                        isActive
                          ? "bg-white dark:bg-slate-800 shadow-xs text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700 scale-102"
                          : "text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100"
                      )}
                    >
                      <span className={cn("w-2 h-2 rounded-full shrink-0", palette.dot)} />
                      <span className="max-w-[80px] truncate">
                        {note.title || "Untitled"}
                      </span>
                      {note.is_pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Note Editor Area */}
            {activeNoteId ? (
              <div className="flex-1 flex flex-col p-4 space-y-3 min-h-0 overflow-y-auto custom-scrollbar">
                {/* Title & Pin Bar */}
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={handleTitleChange}
                    placeholder="Note Title..."
                    className={cn(
                      "w-full font-bold text-base bg-transparent border-b border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-black/20 dark:focus:border-white/20 focus:outline-none transition py-0.5",
                      activePalette.text
                    )}
                  />

                  {/* Pin Button */}
                  <button
                    onClick={handleTogglePin}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors cursor-pointer shrink-0",
                      draftPinned
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                    title={draftPinned ? "Unpin Note" : "Pin Note to Top"}
                  >
                    <Pin className={cn("w-4 h-4", draftPinned && "fill-current")} />
                  </button>
                </div>

                {/* Color Palette Selector */}
                <div className="flex items-center gap-1.5 py-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                    Color:
                  </span>
                  {(Object.keys(NOTE_PALETTES) as PaletteKey[]).map((key) => {
                    const pal = NOTE_PALETTES[key];
                    const isSelected = draftColor === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleColorChange(key)}
                        className={cn(
                          "w-5 h-5 rounded-full transition-transform cursor-pointer border flex items-center justify-center",
                          pal.dot,
                          isSelected ? "scale-125 border-slate-900 dark:border-white shadow-xs" : "border-black/10 opacity-70 hover:opacity-100"
                        )}
                        title={pal.name}
                      >
                        {isSelected && <Check className="w-3 h-3 text-slate-900" />}
                      </button>
                    );
                  })}
                </div>

                {/* Content Textarea */}
                <div className="flex-1 flex min-h-[220px]">
                  <textarea
                    value={draftContent}
                    onChange={handleContentChange}
                    placeholder="Type your notes, reminders, or tasks here..."
                    className={cn(
                      "w-full h-full p-3 rounded-2xl resize-none border focus:outline-none font-sans text-sm leading-relaxed transition shadow-inner",
                      activePalette.editorBg,
                      activePalette.border,
                      activePalette.text
                    )}
                  />
                </div>

                {/* Footer Controls */}
                <div className="pt-2 flex items-center justify-between border-t border-black/5 dark:border-white/5 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClearCurrentNote}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      title="Clear text inside this note"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                    <button
                      onClick={handleDeleteActiveNote}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                      title="Delete this note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSaving && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                        Saving...
                      </span>
                    )}
                    <button
                      onClick={() =>
                        performSave(
                          activeNoteId,
                          draftTitle,
                          draftContent,
                          draftColor,
                          draftPinned
                        )
                      }
                      className="px-3.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold shadow-xs hover:opacity-90 transition cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-base">
                    No Sticky Notes
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[240px]">
                    Quickly jot down your thoughts, reminders, or checklist items.
                  </p>
                </div>
                <button
                  onClick={handleCreateNote}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Note</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default StickyNotesWidget;
