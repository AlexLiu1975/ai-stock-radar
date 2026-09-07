import type { DailyMarketScanResult } from "./runDailyMarketScan.js";

type Scan = (targetDate: string) => Promise<DailyMarketScanResult>;

export function createScheduledRadarScan(scan: Scan) {
  return async (scheduleTime: string): Promise<DailyMarketScanResult> => {
    const result = await scan(taipeiDate(scheduleTime));
    if (!result.published && result.analyzed > 0) {
      throw new Error(`Daily market scan coverage was too low to publish for ${result.targetDate}`);
    }
    return result;
  };
}

export function taipeiDate(isoDateTime: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(isoDateTime));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
