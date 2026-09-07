import type { InstitutionalFlow } from "../domain/types.js";

export interface DatedInstitutionalFlow extends InstitutionalFlow {
  date: string;
}

export interface InstitutionalDataSource {
  fetchDailyFlows(
    symbol: string,
    from: string,
    to: string,
  ): Promise<DatedInstitutionalFlow[]>;
}

interface JsonResponseLike {
  ok: boolean;
  json(): Promise<unknown>;
}

type FetchLike = (url: string) => Promise<JsonResponseLike>;

interface TwseT86Payload {
  stat?: string;
  fields?: string[];
  data?: string[][];
}

const FIELD_FOREIGN_NET = "外陸資買賣超股數(不含外資自營商)";
const FIELD_TRUST_NET = "投信買賣超股數";
const FIELD_DEALER_NET = "自營商買賣超股數";

export class TwseInstitutionalDataSource implements InstitutionalDataSource {
  constructor(private readonly fetcher: FetchLike = fetch) {}

  async fetchDailyFlows(
    symbol: string,
    from: string,
    to: string,
  ): Promise<DatedInstitutionalFlow[]> {
    const result: DatedInstitutionalFlow[] = [];

    for (const date of datesBetween(from, to)) {
      const url = new URL("https://www.twse.com.tw/rwd/zh/fund/T86");
      url.searchParams.set("date", date.replaceAll("-", ""));
      url.searchParams.set("selectType", "ALLBUT0999");
      url.searchParams.set("response", "json");

      const response = await this.fetcher(url.toString());
      if (!response.ok) throw new Error(`TWSE T86 request failed for ${date}`);

      const payload = (await response.json()) as TwseT86Payload;
      if (payload.stat !== "OK" || !payload.fields || !payload.data) continue;

      const symbolIndex = payload.fields.indexOf("證券代號");
      const foreignIndex = payload.fields.indexOf(FIELD_FOREIGN_NET);
      const trustIndex = payload.fields.indexOf(FIELD_TRUST_NET);
      const dealerIndex = payload.fields.indexOf(FIELD_DEALER_NET);

      if ([symbolIndex, foreignIndex, trustIndex, dealerIndex].some((index) => index < 0)) {
        throw new Error("TWSE T86 response schema changed");
      }

      const row = payload.data.find((item) => item[symbolIndex]?.trim() === symbol);
      if (!row) continue;

      result.push({
        date,
        foreignNet: parseInteger(row[foreignIndex]),
        trustNet: parseInteger(row[trustIndex]),
        dealerNet: parseInteger(row[dealerIndex]),
      });
    }

    return result;
  }
}

function parseInteger(value: string | undefined): number {
  if (!value) return 0;
  const normalized = value.replaceAll(",", "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function datesBetween(from: string, to: string): string[] {
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const result: string[] = [];

  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}
