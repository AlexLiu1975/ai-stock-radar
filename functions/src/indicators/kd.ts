import type { DailyBar, KDPoint } from "../domain/types.js";

export function calculateKD(bars: DailyBar[], period = 9): KDPoint[] {
  if (period <= 0) throw new Error("period must be > 0");
  if (bars.length === 0) return [];

  let previousK = 50;
  let previousD = 50;

  return bars.map((bar, index) => {
    const start = Math.max(0, index - period + 1);
    const window = bars.slice(start, index + 1);
    const highestHigh = Math.max(...window.map((item) => item.high));
    const lowestLow = Math.min(...window.map((item) => item.low));

    const rsv = highestHigh === lowestLow
      ? 50
      : ((bar.close - lowestLow) / (highestHigh - lowestLow)) * 100;

    const k = (2 / 3) * previousK + (1 / 3) * rsv;
    const d = (2 / 3) * previousD + (1 / 3) * k;

    previousK = k;
    previousD = d;

    return {
      date: bar.date,
      rsv: clamp(rsv),
      k: clamp(k),
      d: clamp(d),
    };
  });
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}
