import type { DailyBar, KDPoint, MACDPoint } from "../domain/types.js";
import { isPreGoldenCross } from "../indicators/macd.js";

export interface TechnicalScoreResult {
  score: number;
  breakdown: Record<string, number>;
  preGoldenCross: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function scoreTechnical(
  kd: KDPoint[],
  macd: MACDPoint[],
  bars: DailyBar[],
): TechnicalScoreResult {
  if (kd.length === 0 || macd.length === 0 || bars.length === 0) {
    return {
      score: 0,
      breakdown: {
        kdGoldenCross: 0,
        kdLowZone: 0,
        macdSignal: 0,
        oscImprovement: 0,
        macdZeroAxis: 0,
        volumePrice: 0,
      },
      preGoldenCross: false,
    };
  }

  const latestKd = kd.at(-1)!;
  const previousKd = kd.at(-2);
  const kdGoldenCross = previousKd && previousKd.k <= previousKd.d && latestKd.k > latestKd.d ? 15 : 0;
  const kdLowZone = latestKd.k <= 30 && latestKd.d <= 30 ? 5 : 0;

  const latestMacd = macd.at(-1)!;
  const previousMacd = macd.at(-2);
  const macdGoldenCross = Boolean(
    previousMacd && previousMacd.dif <= previousMacd.dea && latestMacd.dif > latestMacd.dea,
  );
  const preGoldenCross = isPreGoldenCross(macd);
  const macdSignal = macdGoldenCross || preGoldenCross ? 15 : 0;

  const recentMacd = macd.slice(-3);
  const oscImprovement =
    recentMacd.length === 3 &&
    recentMacd.every((point) => point.osc < 0) &&
    recentMacd[0].osc < recentMacd[1].osc &&
    recentMacd[1].osc < recentMacd[2].osc
      ? 10
      : 0;

  const macdZeroAxis =
    previousMacd && latestMacd.dif < 0 && latestMacd.dif > previousMacd.dif ? 5 : 0;

  let volumePrice = 0;
  if (bars.length >= 5) {
    const latestBar = bars.at(-1)!;
    const history = bars.slice(0, -1);
    const recentHistory = history.slice(-20);
    const averageVolume = recentHistory.reduce((sum, bar) => sum + bar.volume, 0) / recentHistory.length;
    const priorHighClose = Math.max(...recentHistory.map((bar) => bar.close));
    const moderateVolumeExpansion = averageVolume > 0 && latestBar.volume >= averageVolume * 1.2;
    const priceBreakout = latestBar.close >= priorHighClose;
    if (moderateVolumeExpansion && priceBreakout) volumePrice = 10;
    else if (moderateVolumeExpansion || priceBreakout) volumePrice = 5;
  }

  const breakdown = {
    kdGoldenCross,
    kdLowZone,
    macdSignal,
    oscImprovement,
    macdZeroAxis,
    volumePrice,
  };

  const score = clamp(
    Object.values(breakdown).reduce((sum, value) => sum + value, 0),
    0,
    60,
  );

  return { score, breakdown, preGoldenCross };
}
