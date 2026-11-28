// Run: node frontend/src/lib/daySegments.check.mjs
import assert from "node:assert/strict";
import { daySegments } from "./daySegments.ts";

const t = (hm) => new Date(`2026-11-28T${hm}:00`).toISOString();
const now = new Date("2026-11-28T13:00:00").getTime();

assert.equal(daySegments([], now), null);
assert.equal(daySegments(null, now), null);
assert.equal(daySegments([{ start: "bad" }], now), null);

// 09:00-11:00 worked, 11:00-12:00 break, 12:00-now (13:00) ongoing: span 4h
const d = daySegments([{ start: t("12:00") }, { start: t("09:00"), end: t("11:00") }], now);
assert.equal(d.segments.length, 2);
assert.deepEqual(d.segments[0], { left: 0, width: 50, ongoing: false });
assert.deepEqual(d.segments[1], { left: 75, width: 25, ongoing: true });

// Zero-length span does not divide by zero
const z = daySegments([{ start: t("09:00"), end: t("09:00") }], now);
assert.deepEqual(z.segments, [{ left: 0, width: 100, ongoing: false }]);

console.log("daySegments ok");
