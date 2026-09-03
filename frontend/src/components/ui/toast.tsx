"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "loading" | "info" | "default";

export interface ToastItem {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  type?: ToastType;
  duration?: number;
}

type ToastInput =
  | string
  | {
      title?: React.ReactNode;
      description?: React.ReactNode;
      type?: ToastType;
      duration?: number;
    };

type PromiseToastOptions<T> = {
  loading: ToastInput;
  success: ToastInput | ((data: T) => ToastInput);
  error: ToastInput | ((error: any) => ToastInput);
};

type Listener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<Listener> = new Set();

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  add(input: ToastInput): string {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastItem =
      typeof input === "string"
        ? { id, title: input, type: "default", duration: 4000 }
        : {
            id,
            title: input.title,
            description: input.description,
            type: input.type || "default",
            duration: input.duration ?? (input.type === "loading" ? Infinity : 4000),
          };

    this.toasts = [...this.toasts, toast];
    this.notify();

    if (toast.duration && toast.duration !== Infinity) {
      setTimeout(() => {
        this.dismiss(id);
      }, toast.duration);
    }

    return id;
  }

  update(id: string, input: ToastInput) {
    const updated = typeof input === "string" ? { title: input } : input;
    this.toasts = this.toasts.map((t) => (t.id === id ? { ...t, ...updated } : t));
    this.notify();

    const defaultDuration = (typeof input === "object" && input.type === "error") ? 8000 : 5000;
    const duration = typeof input === "object" && input.duration !== undefined ? input.duration : defaultDuration;
    if (duration && duration !== Infinity) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  dismissAll() {
    this.toasts = [];
    this.notify();
  }

  success(input: ToastInput) {
    if (typeof input === "string") {
      return this.add({ title: input, type: "success" });
    }
    return this.add({ ...input, type: "success" });
  }

  error(input: ToastInput) {
    if (typeof input === "string") {
      return this.add({ title: input, type: "error" });
    }
    return this.add({ ...input, type: "error" });
  }

  info(input: ToastInput) {
    if (typeof input === "string") {
      return this.add({ title: input, type: "info" });
    }
    return this.add({ ...input, type: "info" });
  }

  loading(input: ToastInput) {
    if (typeof input === "string") {
      return this.add({ title: input, type: "loading", duration: Infinity });
    }
    return this.add({ ...input, type: "loading", duration: Infinity });
  }

  promise<T>(promise: Promise<T>, options: PromiseToastOptions<T>): Promise<T> {
    const toastId = this.loading(options.loading);

    return promise
      .then((data) => {
        const successInput =
          typeof options.success === "function"
            ? options.success(data)
            : options.success;
        const normalized =
          typeof successInput === "string"
            ? { title: successInput, type: "success" as const }
            : { ...successInput, type: "success" as const };
        this.update(toastId, normalized);
        return data;
      })
      .catch((err) => {
        const errorInput =
          typeof options.error === "function" ? options.error(err) : options.error;
        const normalized =
          typeof errorInput === "string"
            ? { title: errorInput, type: "error" as const }
            : { ...errorInput, type: "error" as const };
        this.update(toastId, normalized);
        throw err;
      });
  }
}

export const toastManager = new ToastManager();

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toastManager.subscribe(setToasts);
  }, []);

  return (
    <div className="fixed top-4 inset-x-0 mx-auto px-4 z-[99999] flex flex-col items-center gap-3 max-w-sm sm:max-w-md w-full pointer-events-none sm:top-5 sm:right-5 sm:left-auto sm:mx-0 sm:items-end sm:px-0">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, filter: "blur(10px)", y: -16, scale: 0.96 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0, scale: 1 }}
            exit={{ opacity: 0, filter: "blur(8px)", y: -10, scale: 0.95 }}
            whileHover={{ scale: 1.01, transition: { duration: 0.2, ease: "easeInOut" } }}
            whileTap={{ scale: 0.99, transition: { duration: 0.2, ease: "easeInOut" } }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={cn(
              "pointer-events-auto relative overflow-hidden rounded-2xl p-4 shadow-2xl backdrop-blur-2xl border flex items-start gap-3.5 transition-all w-full",
              toast.type === "success" &&
                "bg-slate-900/95 dark:bg-slate-900/95 border-emerald-500/50 text-white shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500/20",
              toast.type === "error" &&
                "bg-slate-900/95 dark:bg-slate-900/95 border-rose-500/50 text-white shadow-xl shadow-rose-950/40 ring-1 ring-rose-500/20",
              toast.type === "loading" &&
                "bg-slate-900/95 dark:bg-slate-900/95 border-amber-500/40 text-white shadow-xl shadow-amber-950/40 ring-1 ring-amber-500/20",
              (toast.type === "info" || toast.type === "default" || !toast.type) &&
                "bg-slate-900/95 dark:bg-slate-900/95 border-white/20 text-white shadow-black/40 ring-1 ring-white/10"
            )}
          >
            {/* Particle / glowing accent behind icon */}
            <div
              className={cn(
                "absolute -top-10 -left-10 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-40",
                toast.type === "success" && "bg-emerald-500",
                toast.type === "error" && "bg-rose-500",
                toast.type === "loading" && "bg-amber-500",
                (!toast.type || toast.type === "info" || toast.type === "default") && "bg-blue-500"
              )}
            />

            {/* Icon */}
            <div className="shrink-0 mt-0.5 relative z-10">
              {toast.type === "success" && (
                <div className="w-8 h-8 rounded-xl bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 flex items-center justify-center shadow-lg shadow-emerald-900/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              )}
              {toast.type === "error" && (
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-inner">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}
              {toast.type === "loading" && (
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
              {(toast.type === "info" || toast.type === "default" || !toast.type) && (
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-inner">
                  <Info className="w-5 h-5" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 relative z-10">
              {toast.title && (
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    {toast.title}
                  </h4>
                  {toast.type === "success" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Success
                    </span>
                  )}
                </div>
              )}
              {toast.description && (
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {toast.description}
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={() => toastManager.dismiss(toast.id)}
              className="shrink-0 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors relative z-10"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
