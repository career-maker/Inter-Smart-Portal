"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Send, Trash2 } from "lucide-react";

const MAX_SECONDS = 180; // keeps a voice note well under the 5 MB upload limit

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m));
}

/**
 * Mic button. Click to start recording; while recording the composer shows a timer with
 * Delete and Send. onRecorded receives the audio File when the user presses Send.
 */
export function VoiceRecorder({
  onRecorded,
  onRecordingChange,
  onError,
  disabled,
}: {
  onRecorded: (file: File) => void;
  onRecordingChange?: (recording: boolean) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sendOnStopRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setSeconds(0);
    onRecordingChange?.(false);
  };

  useEffect(() => {
    return () => {
      sendOnStopRef.current = false;
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError?.("Voice notes are not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const type = rec.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const send = sendOnStopRef.current;
        cleanup();
        if (send && blob.size > 0) {
          const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
          onRecorded(new File([blob], `voice-note-${Date.now()}.${ext}`, { type }));
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setSeconds(0);
      onRecordingChange?.(true);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            sendOnStopRef.current = true;
            if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      cleanup();
      onError?.("Microphone access was blocked. Allow the microphone in your browser to record voice notes.");
    }
  };

  const finish = (send: boolean) => {
    sendOnStopRef.current = send;
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    else cleanup();
  };

  if (!recording) {
    return (
      <button
        type="button"
        onClick={start}
        disabled={disabled}
        className="w-9 h-9 bg-[#56348f] hover:bg-[#432770] disabled:opacity-30 text-white rounded-full flex items-center justify-center shadow-xs transition-all shrink-0 cursor-pointer active:scale-95 mb-0.5"
        title="Record a voice note"
        aria-label="Record a voice note"
      >
        <Mic className="w-4 h-4" />
      </button>
    );
  }

  const mm = String(Math.floor(seconds / 60)).padStart(1, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <button
        type="button"
        onClick={() => finish(false)}
        className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full cursor-pointer"
        title="Discard recording"
        aria-label="Discard recording"
      >
        <Trash2 className="w-5 h-5" />
      </button>
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" aria-hidden />
        Recording {mm}:{ss}
      </span>
      <button
        type="button"
        onClick={() => finish(true)}
        className="w-9 h-9 bg-[#56348f] hover:bg-[#432770] text-white rounded-full flex items-center justify-center shadow-xs shrink-0 cursor-pointer active:scale-95"
        title="Send voice note"
        aria-label="Send voice note"
      >
        <Send className="w-4 h-4 ml-0.5" />
      </button>
    </div>
  );
}
