import { describe, expect, it } from "vitest";
import { buildRadarAnalysis } from "../../src/scoring/radar.js";

describe("buildRadarAnalysis", () => {
  it("classifies scores using the V1 radar thresholds", () => {
    expect(buildRadarAnalysis({ symbol: "2330", date: "2026-09-07", institutionalScore: 35, technicalScore: 50, riskFlags: [] }).signal).toBe("RISE_CONFIRMED");
    expect(buildRadarAnalysis({ symbol: "2330", date: "2026-09-07", institutionalScore: 30, technicalScore: 40, riskFlags: [] }).signal).toBe("EARLY_RISE");
    expect(buildRadarAnalysis({ symbol: "2330", date: "2026-09-07", institutionalScore: 20, technicalScore: 35, riskFlags: [] }).signal).toBe("WATCH");
    expect(buildRadarAnalysis({ symbol: "2330", date: "2026-09-07", institutionalScore: 10, technicalScore: 20, riskFlags: [] }).signal).toBe("WEAK");
  });

  it("does not confirm an overheated stock even when the raw score is high", () => {
    const result = buildRadarAnalysis({
      symbol: "3017",
      date: "2026-09-07",
      institutionalScore: 40,
      technicalScore: 55,
      riskFlags: ["OVERHEATED_KD", "LONG_UPPER_SHADOW"],
      breakdown: { foreign: 15, trust: 15, kdGoldenCross: 15 },
    });

    expect(result.score).toBe(95);
    expect(result.signal).toBe("EARLY_RISE");
    expect(result.riskFlags).toContain("OVERHEATED_KD");
    expect(result.breakdown.foreign).toBe(15);
  });
});
