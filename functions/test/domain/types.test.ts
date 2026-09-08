import { describe, expect, it } from "vitest";
import type { DailyBar, InstitutionalFlow } from "../../src/domain/types.js";

describe("domain types", () => {
  it("accepts normalized market data", () => {
    const bar: DailyBar = {
      date: "2026-09-07",
      open: 100,
      high: 105,
      low: 99,
      close: 104,
      volume: 1_200_000
    };

    const flow: InstitutionalFlow = {
      foreignNet: 100_000,
      trustNet: 50_000,
      dealerNet: -10_000
    };

    expect(bar.close).toBe(104);
    expect(flow.foreignNet + flow.trustNet + flow.dealerNet).toBe(140_000);
  });
});
