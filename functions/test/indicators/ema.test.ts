import { describe, expect, it } from "vitest";
import { calculateEma } from "../../src/indicators/ema.js";

describe("calculateEma", () => {
  it("uses the first value as seed and applies EMA recursively", () => {
    expect(calculateEma([10, 12, 14], 3)).toEqual([10, 11, 12.5]);
  });

  it("rejects invalid periods", () => {
    expect(() => calculateEma([1, 2], 0)).toThrow("period must be > 0");
  });
});
