import type { DailyBar, MACDPoint } from "../domain/types.js";
import { calculateEma } from "./ema.js";

export function calculateMACD(bars: DailyBar[]): MACDPoint[] {
  if (bars.length === 0) return [];

  const closes = bars.map((bar) => bar.close);
  const ema12 = calculateEma(closes, 12);
  const ema26 = calculateEma(closes, 26);
  const dif = closes.map((_, index) => ema12[index] - ema26[index]);
  const dea = calculateEma(dif, 9);

  return bars.map((bar, index) => ({
    date: bar.date,
    dif: dif[index],
    dea: dea[index],
    osc: dif[index] - dea[index],
  }));
}

export function isPreGoldenCross(points: MACDPoint[]): boolean {
  if (points.length < 3) return false;

  const recent = points.slice(-3);

  const allBelowSignal = recent.every((point) => point.dif < point.dea);
  const allNegativeOsc = recent.every((point) => point.osc < 0);
  const shrinkingNegativeGap =
    Math.abs(recent[1].osc) < Math.abs(recent[0].osc) &&
    Math.abs(recent[2].osc) < Math.abs(recent[1].osc);
  const difRising =
    recent[1].dif > recent[0].dif &&
    recent[2].dif > recent[1].dif;

  return allBelowSignal && allNegativeOsc && shrinkingNegativeGap && difRising;
}
