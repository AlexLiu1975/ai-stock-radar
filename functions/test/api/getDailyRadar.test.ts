import { describe, expect, it } from "vitest";
import { getDailyRadar } from "../../src/api/getDailyRadar.js";
import type { RadarAnalysis } from "../../src/domain/types.js";

const topPick: RadarAnalysis = {
  symbol: "2330",
  date: "2026-09-07",
  score: 88,
  signal: "RISE_CONFIRMED",
  riskFlags: [],
  breakdown: { institutional: 36, technical: 52 },
};

const radar = {
  generatedAt: "2026-09-07",
  top10: [topPick],
  watchlist: [],
  overheated: [],
  weakSignals: [],
};

describe("getDailyRadar", () => {
  it("returns the requested date when available", async () => {
    const reader = {
      async getByDate(date: string) {
        return date === "2026-09-07" ? radar : null;
      },
      async getLatest() {
        return radar;
      },
    };

    const result = await getDailyRadar(reader, "2026-09-07");

    expect(result.date).toBe("2026-09-07");
    expect(result.source).toBe("requested");
    expect(result.top10[0]?.symbol).toBe("2330");
  });

  it("falls back to latest radar when the requested date is missing", async () => {
    const reader = {
      async getByDate() {
        return null;
      },
      async getLatest() {
        return radar;
      },
    };

    const result = await getDailyRadar(reader, "2026-09-08");

    expect(result.date).toBe("2026-09-07");
    expect(result.source).toBe("latest-fallback");
  });

  it("throws a clear error when no radar data exists", async () => {
    const reader = {
      async getByDate() {
        return null;
      },
      async getLatest() {
        return null;
      },
    };

    await expect(getDailyRadar(reader, "2026-09-08")).rejects.toThrow(
      "RADAR_NOT_FOUND",
    );
  });
});
