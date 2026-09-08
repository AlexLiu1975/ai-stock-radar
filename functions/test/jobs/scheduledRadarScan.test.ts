import { describe, expect, it, vi } from "vitest";
import { createScheduledRadarScan, taipeiDate } from "../../src/jobs/scheduledRadarScan.js";

describe("scheduled radar scan", () => {
  it("derives the target trading date in Asia/Taipei", () => {
    expect(taipeiDate("2026-09-07T16:30:00.000Z")).toBe("2026-09-08");
  });

  it("runs the market scan for the scheduler event date", async () => {
    const scan = vi.fn(async () => ({
      targetDate: "2026-09-07",
      discovered: 1000,
      analyzed: 980,
      skipped: 15,
      published: true,
      failed: [],
    }));
    const handler = createScheduledRadarScan(scan);

    const result = await handler("2026-09-07T10:00:00.000Z");

    expect(scan).toHaveBeenCalledWith("2026-09-07");
    expect(result.analyzed).toBe(980);
  });

  it("fails the scheduled run when attempted coverage is too low to publish", async () => {
    const handler = createScheduledRadarScan(async (targetDate) => ({
      targetDate,
      discovered: 1000,
      analyzed: 100,
      skipped: 0,
      published: false,
      failed: [{ symbol: "2330", reason: "upstream unavailable" }],
    }));

    await expect(handler("2026-09-07T10:00:00.000Z")).rejects.toThrow(
      "coverage was too low to publish",
    );
  });
});
