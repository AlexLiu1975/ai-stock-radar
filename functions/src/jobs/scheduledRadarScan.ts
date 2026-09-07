import type { DailyMarketScanResult } from "./runDailyMarketScan.js";

type Scan = (targetDate: string) => Promise<DailyMarketScanResult>;

export function createScheduledRadarScan(scan: Scan) {
  return async (scheduleTime: string): Promise<DailyMarketScanResult> => {
    return scan(taipeiDate(scheduleTime));
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
