import type { DailyBar } from "../domain/types.js";

export interface MarketDataSource {
  fetchDailyBars(symbol: string, from: string, to: string): Promise<DailyBar[]>;
}

interface JsonResponseLike {
  ok: boolean;
  json(): Promise<unknown>;
}

type FetchLike = (url: string) => Promise<JsonResponseLike>;

interface TwseStockDayPayload {
  stat?: string;
  data?: string[][];
}

export class TwseMarketDataSource implements MarketDataSource {
  constructor(private readonly fetcher: FetchLike = fetch) {}

  async fetchDailyBars(symbol: string, from: string, to: string): Promise<DailyBar[]> {
    const rows: DailyBar[] = [];

    for (const month of monthsBetween(from, to)) {
      const dateParam = month.replaceAll("-", "") + "01";
      const url = new URL("https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY");
      url.searchParams.set("date", dateParam);
      url.searchParams.set("stockNo", symbol);
      url.searchParams.set("response", "json");

      const response = await this.fetcher(url.toString());
      if (!response.ok) throw new Error(`TWSE STOCK_DAY request failed for ${symbol}`);

      const payload = (await response.json()) as TwseStockDayPayload;
      if (payload.stat !== "OK" || !Array.isArray(payload.data)) continue;

      for (const row of payload.data) {
        const bar = parseStockDayRow(row);
        if (bar && bar.date >= from && bar.date <= to) rows.push(bar);
      }
    }

    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }
}

function parseStockDayRow(row: string[]): DailyBar | null {
  if (row.length < 7) return null;

  const date = rocDateToIso(row[0]);
  const volume = parseNumber(row[1]);
  const open = parseNumber(row[3]);
  const high = parseNumber(row[4]);
  const low = parseNumber(row[5]);
  const close = parseNumber(row[6]);

  if (!date || [volume, open, high, low, close].some((value) => value === null)) {
    return null;
  }

  return {
    date,
    volume: volume!,
    open: open!,
    high: high!,
    low: low!,
    close: close!,
  };
}

function rocDateToIso(value: string): string | null {
  const match = value.trim().match(/^(\d{2,3})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]) + 1911;
  return `${year}-${match[2]}-${match[3]}`;
}

function parseNumber(value: string): number | null {
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized || normalized === "--") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function monthsBetween(from: string, to: string): string[] {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  const cursor = new Date(Date.UTC(fromYear, fromMonth - 1, 1));
  const end = new Date(Date.UTC(toYear, toMonth - 1, 1));
  const result: string[] = [];

  while (cursor <= end) {
    result.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return result;
}
