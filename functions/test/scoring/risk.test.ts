import { describe, expect, it } from "vitest";
import { detectRiskFlags } from "../../src/scoring/risk.js";
import type { DailyBar, InstitutionalFlow, KDPoint, MACDPoint } from "../../src/domain/types.js";

describe("detectRiskFlags", () => {
  it("flags overheated KD and a long upper shadow", () => {
    const bars: DailyBar[] = [
      { date: "2026-09-04", open: 100, high: 102, low: 99, close: 101, volume: 1_000_000 },
      { date: "2026-09-07", open: 102, high: 115, low: 101, close: 104, volume: 2_000_000 },
    ];
    const kd: KDPoint[] = [
      { date: "2026-09-07", rsv: 90, k: 86, d: 82 },
    ];
    const macd: MACDPoint[] = [
      { date: "2026-09-07", dif: 3, dea: 2, osc: 1 },
    ];
    const flows: InstitutionalFlow[] = [
      { foreignNet: 100_000, trustNet: 20_000, dealerNet: 5_000 },
    ];

    const flags = detectRiskFlags(bars, kd, macd, flows);

    expect(flags).toContain("OVERHEATED_KD");
    expect(flags).toContain("LONG_UPPER_SHADOW");
  });

  it("flags low liquidity", () => {
    const bars: DailyBar[] = [
      { date: "2026-09-07", open: 20, high: 20.5, low: 19.8, close: 20.2, volume: 20_000 },
    ];

    expect(detectRiskFlags(bars, [], [], [])).toContain("LOW_LIQUIDITY");
  });
});
