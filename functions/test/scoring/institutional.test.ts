import { describe, expect, it } from "vitest";
import { scoreInstitutional } from "../../src/scoring/institutional.js";

describe("scoreInstitutional", () => {
  it("rewards persistent foreign and trust buying", () => {
    const flows = [
      { foreignNet: 100, trustNet: 50, dealerNet: 10 },
      { foreignNet: 120, trustNet: 60, dealerNet: 5 },
      { foreignNet: 150, trustNet: 80, dealerNet: 10 },
    ];

    const result = scoreInstitutional(flows, [1000, 1000, 1000]);

    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.score).toBeLessThanOrEqual(40);
    expect(result.breakdown.foreign).toBeLessThanOrEqual(15);
    expect(result.breakdown.trust).toBeLessThanOrEqual(15);
    expect(result.breakdown.synchronized).toBeLessThanOrEqual(10);
  });

  it("does not reward three-day institutional selling", () => {
    const flows = [
      { foreignNet: -100, trustNet: -50, dealerNet: -10 },
      { foreignNet: -120, trustNet: -60, dealerNet: -5 },
      { foreignNet: -150, trustNet: -80, dealerNet: -10 },
    ];

    expect(scoreInstitutional(flows, [1000, 1000, 1000]).score).toBe(0);
  });
});
