import { describe, expect, it } from "vitest";
import { TwseStockUniverseSource } from "../../src/data/stockUniverseSource.js";

describe("TwseStockUniverseSource", () => {
  it("returns only four-digit listed common-stock symbols", async () => {
    const fetcher = async () => ({
      ok: true,
      json: async () => [
        { Code: "1101", Name: "台泥" },
        { Code: "2330", Name: "台積電" },
        { Code: "0050", Name: "元大台灣50" },
        { Code: "9103", Name: "美德醫療-DR" },
        { Code: "12345", Name: "非四碼" },
      ],
    });

    const source = new TwseStockUniverseSource(fetcher);

    await expect(source.fetchSymbols()).resolves.toEqual(["1101", "2330"]);
  });

  it("rejects a failed TWSE response", async () => {
    const source = new TwseStockUniverseSource(async () => ({
      ok: false,
      json: async () => [],
    }));

    await expect(source.fetchSymbols()).rejects.toThrow("TWSE STOCK_DAY_ALL request failed");
  });
});
