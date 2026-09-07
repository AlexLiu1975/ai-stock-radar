import { describe, expect, it } from "vitest";
import { evaluateSignals } from "../../src/backtest/evaluateSignals.js";

describe("evaluateSignals", () => {
  it("calculates 5d/10d returns, hit rates and max drawdown", () => {
    const result = evaluateSignals([
      {
        symbol: "2330",
        date: "2026-08-01",
        score: 85,
        entryClose: 100,
        futureCloses: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110],
      },
      {
        symbol: "2317",
        date: "2026-08-01",
        score: 72,
        entryClose: 100,
        futureCloses: [99, 98, 97, 96, 95, 96, 97, 98, 99, 100],
      },
    ]);

    expect(result.count).toBe(2);
    expect(result.average5dReturn).toBeCloseTo(0, 8);
    expect(result.average10dReturn).toBeCloseTo(0.05, 8);
    expect(result.hitRate3).toBeCloseTo(0.5, 8);
    expect(result.hitRate5).toBeCloseTo(0.5, 8);
    expect(result.maxDrawdown).toBeCloseTo(-0.05, 8);
    expect(result.byScoreBand["80-100"].count).toBe(1);
    expect(result.byScoreBand["65-79"].count).toBe(1);
  });

  it("returns zeroed metrics for no signals", () => {
    const result = evaluateSignals([]);

    expect(result.count).toBe(0);
    expect(result.average5dReturn).toBe(0);
    expect(result.hitRate3).toBe(0);
  });
});
