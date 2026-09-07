import { describe, expect, it } from "vitest";
import { calculateKD } from "../../src/indicators/kd.js";

describe("calculateKD", () => {
  it("returns K and D in 0-100 range", () => {
    const bars = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-08-${String(i + 1).padStart(2, "0")}`,
      open: 100 + i,
      high: 102 + i,
      low: 98 + i,
      close: 101 + i,
      volume: 1_000_000,
    }));

    const result = calculateKD(bars);

    expect(result).toHaveLength(12);
    expect(result.at(-1)!.k).toBeGreaterThanOrEqual(0);
    expect(result.at(-1)!.k).toBeLessThanOrEqual(100);
    expect(result.at(-1)!.d).toBeGreaterThanOrEqual(0);
    expect(result.at(-1)!.d).toBeLessThanOrEqual(100);
  });

  it("uses RSV 50 when the period high equals period low", () => {
    const bars = Array.from({ length: 9 }, (_, i) => ({
      date: `2026-08-${String(i + 1).padStart(2, "0")}`,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 100_000,
    }));

    const last = calculateKD(bars).at(-1)!;
    expect(last.rsv).toBe(50);
  });
});
