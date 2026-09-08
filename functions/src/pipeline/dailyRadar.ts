import type { DailyBar, InstitutionalFlow, RadarAnalysis } from "../domain/types.js";
import { calculateKD } from "../indicators/kd.js";
import { calculateMACD } from "../indicators/macd.js";
import { scoreInstitutional } from "../scoring/institutional.js";
import { scoreTechnical } from "../scoring/technical.js";
import { detectRiskFlags } from "../scoring/risk.js";
import { buildRadarAnalysis } from "../scoring/radar.js";

export function analyzeDailyRadar(
  symbol: string,
  bars: DailyBar[],
  flows: InstitutionalFlow[],
): RadarAnalysis {
  if (bars.length === 0) {
    throw new Error("daily bars are required");
  }

  const kd = calculateKD(bars);
  const macd = calculateMACD(bars);
  const institutional = scoreInstitutional(
    flows,
    bars.map((bar) => bar.volume),
  );
  const technical = scoreTechnical(kd, macd, bars);
  const riskFlags = detectRiskFlags(bars, kd, macd, flows);

  return buildRadarAnalysis({
    symbol,
    date: bars.at(-1)!.date,
    institutionalScore: institutional.score,
    technicalScore: technical.score,
    riskFlags,
    breakdown: {
      ...institutional.breakdown,
      ...technical.breakdown,
      preGoldenCross: technical.preGoldenCross ? 1 : 0,
    },
  });
}
