/*
 * UI click sounds for the "Recent" theme, synthesised with Web Audio (no audio files).
 * Patch values match the ones recent.design uses for its buttons, toggles and menus.
 */

type Freq = number | { start: number; end: number };
type Layer = {
  source: { type: "noise"; color: "white" | "pink" } | { type: OscillatorType; frequency: Freq; fm?: { ratio: number; depth: number } };
  filter?: { type: BiquadFilterType; frequency: number; resonance?: number };
  envelope: { attack: number; decay: number; sustain: number; release: number };
  gain: number;
  delay?: number;
};

export type RecentSound = "press" | "pressSoft" | "pressGhost" | "select" | "open" | "close" | "toggleOn" | "toggleOff";

const PATCHES: Record<RecentSound, Layer[]> = {
  press: [
    { source: { type: "noise", color: "white" }, filter: { type: "bandpass", frequency: 2100, resonance: 0.9 }, envelope: { attack: 0, decay: 0.006, sustain: 0, release: 0.003 }, gain: 0.124 },
    { source: { type: "triangle", frequency: { start: 520, end: 430 } }, envelope: { attack: 0.001, decay: 0.038, sustain: 0, release: 0.014 }, gain: 0.698 },
    { source: { type: "sine", frequency: { start: 1220, end: 880 }, fm: { ratio: 0.5, depth: 35 } }, envelope: { attack: 0.001, decay: 0.018, sustain: 0, release: 0.007 }, gain: 0.203 },
  ],
  pressSoft: [
    { source: { type: "noise", color: "pink" }, filter: { type: "bandpass", frequency: 1980, resonance: 0.85 }, envelope: { attack: 0, decay: 0.007, sustain: 0, release: 0.003 }, gain: 0.111 },
    { source: { type: "sine", frequency: { start: 760, end: 580 }, fm: { ratio: 0.5, depth: 24 } }, filter: { type: "lowpass", frequency: 2600, resonance: 0.7 }, envelope: { attack: 0.001, decay: 0.034, sustain: 0, release: 0.012 }, gain: 0.576 },
    { source: { type: "sine", frequency: { start: 1420, end: 1100 } }, envelope: { attack: 0.001, decay: 0.016, sustain: 0, release: 0.006 }, gain: 0.155 },
  ],
  pressGhost: [
    { source: { type: "noise", color: "white" }, filter: { type: "bandpass", frequency: 7200, resonance: 1.1 }, envelope: { attack: 0, decay: 0.004, sustain: 0, release: 0.002 }, gain: 0.25 },
    { source: { type: "sine", frequency: { start: 2200, end: 1800 }, fm: { ratio: 0.5, depth: 42 } }, envelope: { attack: 0, decay: 0.014, sustain: 0, release: 0.005 }, gain: 0.683 },
    { source: { type: "triangle", frequency: { start: 320, end: 240 } }, envelope: { attack: 0, decay: 0.021, sustain: 0, release: 0.008 }, gain: 0.25 },
  ],
  select: [{ source: { type: "sine", frequency: { start: 860, end: 1040 } }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 }, gain: 0.5 }],
  open: [{ source: { type: "sine", frequency: { start: 420, end: 760 } }, envelope: { attack: 0.002, decay: 0.09, sustain: 0, release: 0.03 }, gain: 0.392 }],
  close: [{ source: { type: "sine", frequency: { start: 720, end: 360 } }, envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.025 }, gain: 0.408 }],
  toggleOn: [
    { source: { type: "sine", frequency: 520 }, envelope: { attack: 0.001, decay: 0.065, sustain: 0, release: 0.02 }, gain: 0.315 },
    { source: { type: "sine", frequency: 760 }, envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.02 }, delay: 0.035, gain: 0.315 },
  ],
  toggleOff: [
    { source: { type: "sine", frequency: 620 }, envelope: { attack: 0.001, decay: 0.055, sustain: 0, release: 0.018 }, gain: 0.352 },
    { source: { type: "sine", frequency: 410 }, envelope: { attack: 0.001, decay: 0.055, sustain: 0, release: 0.018 }, delay: 0.03, gain: 0.352 },
  ],
};

const SILENT = 1e-4;
let ctx: AudioContext | null = null;

function noiseBuffer(ac: AudioContext, color: "white" | "pink", seconds: number) {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
  const d = buf.getChannelData(0);
  if (color === "white") {
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  // Paul Kellet pink-noise filter (same coefficients recent.design uses)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}

export function playRecentSound(name: RecentSound) {
  if (typeof window === "undefined" || !("AudioContext" in window)) return;
  try {
    if (!ctx || ctx.state === "closed") ctx = new AudioContext({ latencyHint: "interactive" });
    if (ctx.state === "suspended") void ctx.resume();
    const ac = ctx;
    const now = ac.currentTime;
    for (const layer of PATCHES[name]) {
      const t = now + (layer.delay ?? 0);
      const { attack, decay, release } = layer.envelope;
      const dur = attack + decay + release;

      // Envelope: start silent, jump/ramp to gain, exponential fall (time constant decay/3)
      const env = ac.createGain();
      env.gain.setValueAtTime(SILENT, t);
      if (attack > 0) env.gain.linearRampToValueAtTime(layer.gain, t + attack);
      else env.gain.setValueAtTime(layer.gain, t);
      env.gain.setTargetAtTime(SILENT, t + attack, decay / 3);

      let src: AudioScheduledSourceNode;
      if (layer.source.type === "noise") {
        const n = ac.createBufferSource();
        n.buffer = noiseBuffer(ac, layer.source.color, dur + 0.1);
        src = n;
      } else {
        const osc = ac.createOscillator();
        osc.type = layer.source.type;
        const f = layer.source.frequency;
        if (typeof f === "number") osc.frequency.setValueAtTime(f, t);
        else {
          osc.frequency.setValueAtTime(f.start, t);
          osc.frequency.exponentialRampToValueAtTime(Math.max(f.end, 1), t + dur);
        }
        if (layer.source.fm) {
          const mod = ac.createOscillator();
          mod.frequency.value = (typeof f === "number" ? f : f.start) * layer.source.fm.ratio;
          const depth = ac.createGain();
          depth.gain.value = layer.source.fm.depth;
          mod.connect(depth).connect(osc.frequency);
          mod.start(t);
          mod.stop(t + dur + 0.1);
        }
        src = osc;
      }

      let tail: AudioNode = src;
      if (layer.filter) {
        const bq = ac.createBiquadFilter();
        bq.type = layer.filter.type;
        bq.frequency.setValueAtTime(layer.filter.frequency, t);
        bq.Q.value = layer.filter.resonance ?? 1;
        tail.connect(bq);
        tail = bq;
      }
      tail.connect(env).connect(ac.destination);
      src.start(t);
      src.stop(t + dur + 0.1);
      src.onended = () => { try { env.disconnect(); } catch {} };
    }
  } catch {
    // Audio is decoration only; never let it break a click.
  }
}

/** Which sound a clicked element should make, or null for no sound. */
export function soundForElement(el: Element): RecentSound | null {
  const target = el.closest(
    'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="switch"], [role="checkbox"], input[type="checkbox"], input[type="radio"], summary, select'
  );
  if (!target) return null;
  if (target.matches(":disabled, [aria-disabled='true']")) return null;

  const role = target.getAttribute("role");
  if (role === "switch" || role === "checkbox" || target.matches('input[type="checkbox"], input[type="radio"]')) {
    // State after the click: aria-checked/checked has not flipped yet for ARIA widgets, has for native inputs
    const native = target as HTMLInputElement;
    const on = target instanceof HTMLInputElement ? native.checked : target.getAttribute("aria-checked") !== "true";
    return on ? "toggleOn" : "toggleOff";
  }
  if (target.hasAttribute("aria-expanded")) return target.getAttribute("aria-expanded") === "true" ? "close" : "open";
  if (role === "tab" || role === "option" || role === "menuitem" || target.hasAttribute("data-subtab") || target.matches("select")) return "select";

  const cls = typeof (target as HTMLElement).className === "string" ? (target as HTMLElement).className : "";
  if (/\bbg-(primary|black|slate-900|gray-900)\b/.test(cls)) return "press";
  if (/\b(border|shadow)\b|\bbg-white\b/.test(cls)) return "pressSoft";
  return "pressGhost";
}
