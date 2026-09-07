import { describe, expect, it, vi } from "vitest";
import type { DailyBar, InstitutionalFlow, RadarAnalysis } from "../../src/domain/types.js";
import { runDailyMarketScan } from "../../src/jobs/runDailyMarketScan.js";

const bars = (date: string): DailyBar[] => Array.from({ length: 35 }, (_, index) => ({
  date: index === 34 ? date : `2026-07-${String(index + 1).padStart(2, "0")}`,
  open: 100,
  high: 102,
  low: 99,
  close: 101,
  volume: 1_000_000,
}));

const flows: InstitutionalFlow[] = Array.from({ length: 35 }, () => ({
  foreignNet: 1_000,
  trustNet: 500,
  dealerNet: 100,
}));

describe("runDailyMarketScan", () => {
  it("publishes analyses for the target trading day and isolates symbol failures", async () => {
    const saveDailyStockAnalysis = vi.fn(async (_analysis: RadarAnalysis) => undefined);
    const saveDailyRadar = vi.fn(async (_date: string, _buckets: { top10: RadarAnalysis[] }) => undefined);
    const analyzer = vi.fn((symbol: string): RadarAnalysis => ({
      symbol,
      date: "2026-09-07",
      score: symbol === "2330" ? 82 : 68,
      signal: "RISE_CONFIRMED",
      riskFlags: [],
      breakdown: {},
    }));

    const result = await runDailyMarketScan({
      targetDate: "2026-09-07",
      lookbackDays: 90,
      concurrency: 2,
      minimumCoverage: 0.5,
      universe: { fetchSymbols: async () => ["1101", "2330", "2603"] },
      market: {
        fetchDailyBars: async (symbol) => {
          if (symbol === "2603") throw new Error("upstream timeout");
          return bars("2026-09-07");
        },
      },
      institutional: { fetchDailyFlows: async () => flows.map((flow, index) => ({ ...flow, date: `2026-07-${String(index + 1).padStart(2, "0")}` })) },
      repository: { saveDailyStockAnalysis, saveDailyRadar },
      analyzer,
    });

    expect(result).toEqual({
      targetDate: "2026-09-07",
      discovered: 3,
      analyzed: 2,
      skipped: 0,
      failed: [{ symbol: "2603", reason: "upstream timeout" }],
    });
    expect(saveDailyStockAnalysis).toHaveBeenCalledTimes(2);
    expect(saveDailyRadar).toHaveBeenCalledOnce();
    expect(saveDailyRadar.mock.calls[0]?.[0]).toBe("2026-09-07");
    expect(saveDailyRadar.mock.calls[0]?.[1].top10.map((item: RadarAnalysis) => item.symbol)).toEqual(["2330", "1101"]);
  });

  it("skips symbols whose latest bar is not the target date", async () => {
    const saveDailyRadar = vi.fn(async (_date: string, _buckets: { top10: RadarAnalysis[] }) => undefined);

    const result = await runDailyMarketScan({
      targetDate: "2026-09-07",
      universe: { fetchSymbols: async () => ["2330"] },
      market: { fetchDailyBars: async () => bars("2026-09-04") },
      institutional: { fetchDailyFlows: async () => [] },
      repository: { saveDailyStockAnalysis: async () => undefined, saveDailyRadar },
    });

    expect(result.skipped).toBe(1);
    expect(result.analyzed).toBe(0);
    expect(saveDailyRadar).not.toHaveBeenCalled();
  });

  it("does not publish a misleading radar when market coverage is too low", async () => {
    const saveDailyRadar = vi.fn(async (_date: string, _buckets: { top10: RadarAnalysis[] }) => undefined);

    const result = await runDailyMarketScan({
      targetDate: "2026-09-07",
      universe: { fetchSymbols: async () => ["1101", "2330", "2603"] },
      market: {
        fetchDailyBars: async (symbol) => {
          if (symbol !== "2330") throw new Error("upstream unavailable");
          return bars("2026-09-07");
        },
      },
      institutional: { fetchDailyFlows: async () => flows.map((flow, index) => ({ ...flow, date: `2026-07-${String(index + 1).padStart(2, "0")}` })) },
      repository: { saveDailyStockAnalysis: async () => undefined, saveDailyRadar },
      analyzer: (symbol) => ({ symbol, date: "2026-09-07", score: 80, signal: "RISE_CONFIRMED", riskFlags: [], breakdown: {} }),
    });

    expect(result.analyzed).toBe(1);
    expect(result.failed).toHaveLength(2);
    expect(saveDailyRadar).not.toHaveBeenCalled();
  });
});
