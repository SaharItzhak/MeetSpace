import { describe, expect, it } from "vitest";
import { intervalsOverlap, mergeIntervals, overlapsAny } from "./overlap.js";

const d = (iso: string) => new Date(iso);

describe("intervalsOverlap", () => {
  it("detects clear overlap", () => {
    const a = { start: d("2024-01-01T09:00:00Z"), end: d("2024-01-01T10:00:00Z") };
    const b = { start: d("2024-01-01T09:30:00Z"), end: d("2024-01-01T10:30:00Z") };
    expect(intervalsOverlap(a, b)).toBe(true);
  });

  it("treats touching edges as non-overlapping (half-open intervals)", () => {
    const a = { start: d("2024-01-01T09:00:00Z"), end: d("2024-01-01T10:00:00Z") };
    const b = { start: d("2024-01-01T10:00:00Z"), end: d("2024-01-01T11:00:00Z") };
    expect(intervalsOverlap(a, b)).toBe(false);
  });

  it("detects no overlap when far apart", () => {
    const a = { start: d("2024-01-01T09:00:00Z"), end: d("2024-01-01T10:00:00Z") };
    const b = { start: d("2024-01-01T12:00:00Z"), end: d("2024-01-01T13:00:00Z") };
    expect(intervalsOverlap(a, b)).toBe(false);
  });

  it("detects containment", () => {
    const a = { start: d("2024-01-01T09:00:00Z"), end: d("2024-01-01T12:00:00Z") };
    const b = { start: d("2024-01-01T10:00:00Z"), end: d("2024-01-01T10:30:00Z") };
    expect(intervalsOverlap(a, b)).toBe(true);
  });
});

describe("overlapsAny", () => {
  it("returns true if any interval overlaps", () => {
    const candidate = { start: d("2024-01-01T09:00:00Z"), end: d("2024-01-01T09:30:00Z") };
    const busy = [
      { start: d("2024-01-01T08:00:00Z"), end: d("2024-01-01T08:30:00Z") },
      { start: d("2024-01-01T09:15:00Z"), end: d("2024-01-01T09:45:00Z") },
    ];
    expect(overlapsAny(candidate, busy)).toBe(true);
  });

  it("returns false with empty busy list", () => {
    const candidate = { start: d("2024-01-01T09:00:00Z"), end: d("2024-01-01T09:30:00Z") };
    expect(overlapsAny(candidate, [])).toBe(false);
  });
});

describe("mergeIntervals", () => {
  it("merges overlapping and adjacent intervals and sorts them", () => {
    const merged = mergeIntervals([
      { start: d("2024-01-01T10:00:00Z"), end: d("2024-01-01T11:00:00Z") },
      { start: d("2024-01-01T09:00:00Z"), end: d("2024-01-01T10:00:00Z") },
      { start: d("2024-01-01T12:00:00Z"), end: d("2024-01-01T13:00:00Z") },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual({
      start: d("2024-01-01T09:00:00Z"),
      end: d("2024-01-01T11:00:00Z"),
    });
    expect(merged[1]).toEqual({
      start: d("2024-01-01T12:00:00Z"),
      end: d("2024-01-01T13:00:00Z"),
    });
  });
});
