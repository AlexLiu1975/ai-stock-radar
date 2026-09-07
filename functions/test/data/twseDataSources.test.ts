import { describe, expect, it } from "vitest";
import { TwseMarketDataSource } from "../../src/data/marketDataSource.js";
import { TwseInstitutionalDataSource } from "../../src/data/institutionalDataSource.js";

describe("TWSE data sources", () => {
  it("normalizes monthly STOCK_DAY rows into DailyBar", async () => {
    const fetcher = async () => ({
      ok: true,
      json: async () => ({
        stat: "OK",
        data: [
          ["115/09/01", "31,855,287", "77,463,413,685", "2,395.00", "2,440.00", "2,390.00", "2,440.00", "+35.00", "65,271"],
          ["115/09/02", "25,151,394", "60,261,105,308", "2,415.00", "2,420.00", "2,385.00", "2,385.00", "-55.00", "198,779"],
        ],
      }),
    });

    const source = new TwseMarketDataSource(fetcher);
    const bars = await source.fetchDailyBars("2330", "2026-09-01", "2026-09-02");

    expect(bars).toEqual([
      { date: "2026-09-01", open: 2395, high: 2440, low: 2390, close: 2440, volume: 31855287 },
      { date: "2026-09-02", open: 2415, high: 2420, low: 2385, close: 2385, volume: 25151394 },
    ]);
  });

  it("normalizes T86 institutional flows by exact field names", async () => {
    const fetcher = async () => ({
      ok: true,
      json: async () => ({
        stat: "OK",
        fields: [
          "證券代號",
          "證券名稱",
          "外陸資買進股數(不含外資自營商)",
          "外陸資賣出股數(不含外資自營商)",
          "外陸資買賣超股數(不含外資自營商)",
          "外資自營商買進股數",
          "外資自營商賣出股數",
          "外資自營商買賣超股數",
          "投信買進股數",
          "投信賣出股數",
          "投信買賣超股數",
          "自營商買賣超股數",
          "自營商買進股數(自行買賣)",
          "自營商賣出股數(自行買賣)",
          "自營商買賣超股數(自行買賣)",
          "自營商買進股數(避險)",
          "自營商賣出股數(避險)",
          "自營商買賣超股數(避險)",
          "三大法人買賣超股數",
        ],
        data: [
          ["2330", "台積電", "10,000", "8,000", "2,000", "0", "0", "0", "5,000", "1,000", "4,000", "-500", "0", "0", "0", "0", "0", "0", "5,500"],
        ],
      }),
    });

    const source = new TwseInstitutionalDataSource(fetcher);
    const flows = await source.fetchDailyFlows("2330", "2026-09-04", "2026-09-04");

    expect(flows).toEqual([
      { date: "2026-09-04", foreignNet: 2000, trustNet: 4000, dealerNet: -500 },
    ]);
  });
});
