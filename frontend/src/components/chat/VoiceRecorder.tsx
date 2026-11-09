"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Send, Trash2 } from "lucide-react";

// Recorded as 16 kHz mono WAV: unlike MediaRecorder's webm/mp4 the file has a real duration header and plays
// in every browser (iPhone Safari included). 120 s is about 3.8 MB, under the 5 MB upload limit.
const MAX_SECONDS = 120;
const TARGET_RATE = 16000;

function encodeWav(chunks: Float32Array[], inputRate: number): Blob {
  let total = 0;
  chunks.forEach((c) => (total += c.length));
  const input = new Float32Array(total);
  let off = 0;
  chunks.forEach((c) => {
    input.set(c, off);
    off += c.length;
  });

  // Downsample by averaging each window (cheap low-pass), then normalise quiet phone recordings
  const ratio = inputRate / TARGET_RATE;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = end > start ? sum / (end - start) : 0;
  }
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  const gain = peak > 0.001 ? Math.min(0.95 / peak, 10) : 1;

  const buffer = new ArrayBuffer(44 + outLen * 2);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + outLen * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, TARGET_RATE, true);
  view.setUint32(28, TARGET_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, outLen * 2, true);
  for (let i = 0; i < outLen; i++) {
    const s = Math.max(-1, Math.min(1, out[i] * gain));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
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
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rateRef = useRef(48000);

  const teardown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (nodeRef.current) {
      nodeRef.current.onaudioprocess = null;
      nodeRef.current.disconnect();
    }
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    nodeRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
  };

  useEffect(() => teardown, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    teardown();
    chunksRef.current = [];
    setRecording(false);
    setSeconds(0);
    onRecordingChange?.(false);
  };

  const start = async () => {
    const Ctor = typeof window !== "undefined" ? window.AudioContext || (window as any).webkitAudioContext : null;
    if (!navigator.mediaDevices?.getUserMedia || !Ctor) {
      onError?.("Voice notes are not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const ctx: AudioContext = new Ctor();
      if (ctx.state === "suspended") await ctx.resume();
      streamRef.current = stream;
      ctxRef.current = ctx;
      rateRef.current = ctx.sampleRate;
      const source = ctx.createMediaStreamSource(stream);
      // ScriptProcessor is deprecated but the one capture API that works in every browser without a separate worklet file
      const node = ctx.createScriptProcessor(4096, 1, 1);
      chunksRef.current = [];
      node.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(node);
      node.connect(ctx.destination); // outputs silence; needed for the node to run
      sourceRef.current = source;
      nodeRef.current = node;

      setRecording(true);
      setSeconds(0);
      onRecordingChange?.(true);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) finish(true);
          return s + 1;
        });
      }, 1000);
    } catch {
      reset();
      onError?.("Microphone access was blocked. Allow the microphone for this site in your browser settings to record voice notes.");
    }
  };

  const finish = (send: boolean) => {
    const chunks = chunksRef.current;
    const rate = rateRef.current;
    reset();
    if (!send || chunks.length === 0) return;
    const blob = encodeWav(chunks, rate);
    if (blob.size < 1000) {
      onError?.("The recording was too short.");
      return;
    }
    onRecorded(new File([blob], `voice-note-${Date.now()}.wav`, { type: "audio/wav" }));
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

  const mm = String(Math.floor(seconds / 60));
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
