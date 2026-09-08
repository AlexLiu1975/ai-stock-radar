import { describe, expect, it } from "vitest";
import { scoreTechnical } from "../../src/scoring/technical.js";
import type { DailyBar, KDPoint, MACDPoint } from "../../src/domain/types.js";

describe("scoreTechnical", () => {
  it("rewards a low-zone KD golden cross with improving MACD momentum", () => {
    const bars: DailyBar[] = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-08-${String(i + 1).padStart(2, "0")}`,
      open: 100 + i * 0.1,
      high: 101 + i * 0.1,
      low: 99 + i * 0.1,
      close: 100 + i * 0.1,
      volume: i === 19 ? 1_500_000 : 1_000_000,
    }));

    const kd: KDPoint[] = [
      { date: "2026-08-18", rsv: 15, k: 16, d: 18 },
      { date: "2026-08-19", rsv: 19, k: 18, d: 18.5 },
      { date: "2026-08-20", rsv: 28, k: 22, d: 19.7 },
    ];

    const macd: MACDPoint[] = [
      { date: "2026-08-18", dif: -1.5, dea: -1.0, osc: -0.5 },
      { date: "2026-08-19", dif: -1.3, dea: -1.0, osc: -0.3 },
      { date: "2026-08-20", dif: -1.15, dea: -1.0, osc: -0.15 },
    ];

    const result = scoreTechnical(kd, macd, bars);

    expect(result.preGoldenCross).toBe(true);
    expect(result.breakdown.kdGoldenCross).toBe(15);
    expect(result.breakdown.kdLowZone).toBe(5);
    expect(result.breakdown.macdSignal).toBe(15);
    expect(result.breakdown.oscImprovement).toBe(10);
    expect(result.score).toBeGreaterThanOrEqual(45);
    expect(result.score).toBeLessThanOrEqual(60);
  });

  it("keeps the technical score inside 0-60", () => {
    const result = scoreTechnical([], [], []);
    expect(result.score).toBe(0);
  });
});
