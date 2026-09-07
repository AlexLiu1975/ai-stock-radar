import { describe, expect, it, vi } from "vitest";
import { createRadarHttpHandler } from "../../src/api/radarHttpHandler.js";

const radar = {
  generatedAt: "2026-09-07",
  top10: [],
  watchlist: [],
  overheated: [],
  weakSignals: [],
};

describe("createRadarHttpHandler", () => {
  it("returns JSON radar data", async () => {
    const reader = {
      async getByDate() { return radar; },
      async getLatest() { return radar; },
    };
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const handler = createRadarHttpHandler(reader);

    await handler({ query: { date: "2026-09-07" } }, { status, json });

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ date: "2026-09-07" }));
  });

  it("returns 404 when radar does not exist", async () => {
    const reader = {
      async getByDate() { return null; },
      async getLatest() { return null; },
    };
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const handler = createRadarHttpHandler(reader);

    await handler({ query: {} }, { status, json });

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: "RADAR_NOT_FOUND" });
  });
});
