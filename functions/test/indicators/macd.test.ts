import { describe, expect, it } from "vitest";
import { calculateMACD, isPreGoldenCross } from "../../src/indicators/macd.js";

describe("MACD", () => {
  it("calculates DIF, DEA and OSC for every bar", () => {
    const bars = Array.from({ length: 40 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      open: 100 + i,
      high: 101 + i,
      low: 99 + i,
      close: 100 + i,
      volume: 1_000_000,
    }));

    const result = calculateMACD(bars);
    expect(result).toHaveLength(40);
    expect(result.at(-1)!.osc).toBeCloseTo(
      result.at(-1)!.dif - result.at(-1)!.dea,
      10,
    );
  });

  it("detects a pre-golden-cross when the negative gap shrinks and DIF rises", () => {
    const points = [
      { date: "1", dif: -1.5, dea: -1.0, osc: -0.5 },
      { date: "2", dif: -1.3, dea: -1.0, osc: -0.3 },
      { date: "3", dif: -1.15, dea: -1.0, osc: -0.15 },
    ];

    expect(isPreGoldenCross(points)).toBe(true);
  });

  it("does not signal pre-golden-cross after DIF has crossed above DEA", () => {
    const points = [
      { date: "1", dif: -0.4, dea: -0.2, osc: -0.2 },
      { date: "2", dif: -0.1, dea: -0.15, osc: 0.05 },
      { date: "3", dif: 0.1, dea: -0.05, osc: 0.15 },
    ];

    expect(isPreGoldenCross(points)).toBe(false);
  });
});
