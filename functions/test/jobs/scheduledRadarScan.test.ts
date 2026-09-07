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
      failed: [],
    }));
    const handler = createScheduledRadarScan(scan);

    const result = await handler("2026-09-07T10:00:00.000Z");

    expect(scan).toHaveBeenCalledWith("2026-09-07");
    expect(result.analyzed).toBe(980);
  });
});
