import type { RadarAnalysis, RiskFlag } from "../domain/types.js";

export interface DailyRadarResult {
  top10: RadarAnalysis[];
  watchlist: RadarAnalysis[];
  overheated: RadarAnalysis[];
  weakSignals: RadarAnalysis[];
}

const OVERHEAT_FLAGS = new Set<RiskFlag>([
  "OVERHEATED_KD",
  "EXTENDED_PRICE",
  "LONG_UPPER_SHADOW",
  "VOLUME_EXHAUSTION",
]);

export function generateDailyRadar(analyses: RadarAnalysis[]): DailyRadarResult {
  const sorted = [...analyses].sort((a, b) => b.score - a.score);

  const overheated = sorted.filter((item) =>
    item.riskFlags.some((flag) => OVERHEAT_FLAGS.has(flag)),
  );

  const eligible = sorted.filter(
    (item) => !item.riskFlags.some((flag) => OVERHEAT_FLAGS.has(flag)),
  );

  const top10 = eligible
    .filter(
      (item) =>
        item.signal === "RISE_CONFIRMED" || item.signal === "EARLY_RISE",
    )
    .slice(0, 10);

  const watchlist = eligible.filter((item) => item.signal === "WATCH");
  const weakSignals = eligible.filter((item) => item.signal === "WEAK");

  return {
    top10,
    watchlist,
    overheated,
    weakSignals,
  };
}
