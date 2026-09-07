interface JsonResponseLike {
  ok: boolean;
  json(): Promise<unknown>;
}

type FetchLike = (url: string) => Promise<JsonResponseLike>;

export interface StockUniverseSource {
  fetchSymbols(): Promise<string[]>;
}

interface StockDayAllRow {
  Code?: unknown;
}

export class TwseStockUniverseSource implements StockUniverseSource {
  constructor(private readonly fetcher: FetchLike = fetch) {}

  async fetchSymbols(): Promise<string[]> {
    const response = await this.fetcher(
      "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL",
    );
    if (!response.ok) throw new Error("TWSE STOCK_DAY_ALL request failed");

    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error("TWSE STOCK_DAY_ALL response schema changed");

    return payload
      .map((row) => (row as StockDayAllRow).Code)
      .filter((code): code is string => typeof code === "string")
      .map((code) => code.trim())
      .filter((code) => /^(?!00|91)\d{4}$/.test(code));
  }
}
