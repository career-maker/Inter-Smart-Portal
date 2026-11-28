// Turns today's working sessions into bar segments for the attendance day-timeline.
// Positions are percentages of the span from the first check-in to the last check-out (or now, while working).

export interface WorkSession {
  start?: string | null;
  end?: string | null;
}

export interface DaySegment {
  left: number;
  width: number;
  ongoing: boolean;
}

export interface DayTimeline {
  startMs: number;
  endMs: number;
  segments: DaySegment[];
}

export function daySegments(sessions: WorkSession[] | null | undefined, nowMs: number): DayTimeline | null {
  const spans = (sessions || [])
    .map((s) => ({
      start: s.start ? new Date(s.start).getTime() : NaN,
      end: s.end ? new Date(s.end).getTime() : nowMs,
      ongoing: !s.end,
    }))
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end >= s.start)
    .sort((a, b) => a.start - b.start);

  if (spans.length === 0) return null;

  const startMs = spans[0].start;
  const endMs = Math.max(...spans.map((s) => s.end));
  const total = endMs - startMs;
  if (total <= 0) return { startMs, endMs, segments: [{ left: 0, width: 100, ongoing: spans[0].ongoing }] };

  return {
    startMs,
    endMs,
    segments: spans.map((s) => ({
      left: ((s.start - startMs) / total) * 100,
      width: ((s.end - s.start) / total) * 100,
      ongoing: s.ongoing,
    })),
  };
}
