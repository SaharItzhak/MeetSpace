import type { Interval } from "./types.js";

/** Returns true if two half-open intervals [start, end) overlap at all. */
export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/** Returns true if `candidate` is fully contained within any of `busy` intervals. */
export function overlapsAny(candidate: Interval, busy: Interval[]): boolean {
  return busy.some((interval) => intervalsOverlap(candidate, interval));
}

/**
 * Merges overlapping/adjacent intervals and returns them sorted ascending.
 * Useful for collapsing Google Calendar freebusy results before subtracting them
 * from candidate slots.
 */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const first = sorted[0];
  if (!first) return [];
  const merged: Interval[] = [{ ...first }];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (!current || !last) continue;
    if (current.start.getTime() <= last.end.getTime()) {
      if (current.end.getTime() > last.end.getTime()) {
        last.end = current.end;
      }
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}
