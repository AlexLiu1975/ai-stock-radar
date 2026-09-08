import { describe, expect, it } from "vitest";
import type { RadarAnalysis } from "../../src/domain/types.js";
import { generateDailyRadar } from "../../src/jobs/generateDailyRadar.js";

function analysis(
  symbol: string,
  score: number,
  signal: RadarAnalysis["signal"],
  riskFlags: RadarAnalysis["riskFlags"] = [],
): RadarAnalysis {
  return {
    symbol,
    date: "2026-09-07",
    score,
    signal,
    riskFlags,
    breakdown: {},
  };
}

describe("generateDailyRadar", () => {
  it("ranks non-overheated rise candidates by score and limits top10", () => {
    const inputs = Array.from({ length: 12 }, (_, index) =>
      analysis(
        String(1000 + index),
        90 - index,
        index < 6 ? "RISE_CONFIRMED" : "EARLY_RISE",
      ),
    );

    const result = generateDailyRadar(inputs);

    expect(result.top10).toHaveLength(10);
    expect(result.top10[0].score).toBe(90);
    expect(result.top10[9].score).toBe(81);
  });

  it("separates overheated high-score stocks from top10", () => {
    const result = generateDailyRadar([
      analysis("3017", 95, "RISE_CONFIRMED", ["OVERHEATED_KD"]),
      analysis("2330", 82, "RISE_CONFIRMED"),
      analysis("2308", 58, "WATCH"),
      analysis("9999", 42, "WEAK"),
    ]);

    expect(result.top10.map((item) => item.symbol)).toEqual(["2330"]);
    expect(result.overheated.map((item) => item.symbol)).toEqual(["3017"]);
    expect(result.watchlist.map((item) => item.symbol)).toEqual(["2308"]);
    expect(result.weakSignals.map((item) => item.symbol)).toEqual(["9999"]);
  });
});
