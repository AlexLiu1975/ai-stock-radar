import { describe, expect, it } from "vitest";
import { analyzeDailyRadar } from "../../src/pipeline/dailyRadar.js";
import type { DailyBar, InstitutionalFlow } from "../../src/domain/types.js";

describe("analyzeDailyRadar", () => {
  it("combines indicators, institutional flow, risk and scoring into one result", () => {
    const bars: DailyBar[] = Array.from({ length: 35 }, (_, i) => {
      const close = 100 + i * 0.4;
      return {
        date: `2026-08-${String(i + 1).padStart(2, "0")}`,
        open: close - 0.3,
        high: close + 0.8,
        low: close - 0.8,
        close,
        volume: i === 34 ? 1_500_000 : 1_000_000,
      };
    });

    const flows: InstitutionalFlow[] = Array.from({ length: 35 }, (_, i) => ({
      foreignNet: i >= 32 ? 150_000 + i * 1_000 : 20_000,
      trustNet: i >= 32 ? 80_000 + i * 500 : 10_000,
      dealerNet: 5_000,
    }));

    const result = analyzeDailyRadar("2330", bars, flows);

    expect(result.symbol).toBe("2330");
    expect(result.date).toBe(bars.at(-1)!.date);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.breakdown).toHaveProperty("institutionalScore");
    expect(result.breakdown).toHaveProperty("technicalScore");
    expect(Array.isArray(result.riskFlags)).toBe(true);
  });

  it("rejects an empty price series", () => {
    expect(() => analyzeDailyRadar("2330", [], [])).toThrow("daily bars are required");
  });
});
