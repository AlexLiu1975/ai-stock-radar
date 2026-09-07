import type { RadarAnalysis, RiskFlag } from "../domain/types.js";

export interface BuildRadarAnalysisInput {
  symbol: string;
  date: string;
  institutionalScore: number;
  technicalScore: number;
  riskFlags: RiskFlag[];
  breakdown?: Record<string, number>;
}

const severeRiskFlags = new Set<RiskFlag>([
  "OVERHEATED_KD",
  "EXTENDED_PRICE",
  "LONG_UPPER_SHADOW",
  "VOLUME_EXHAUSTION",
]);

function classify(score: number): RadarAnalysis["signal"] {
  if (score >= 80) return "RISE_CONFIRMED";
  if (score >= 65) return "EARLY_RISE";
  if (score >= 50) return "WATCH";
  return "WEAK";
}

export function buildRadarAnalysis(input: BuildRadarAnalysisInput): RadarAnalysis {
  const institutionalScore = Math.min(40, Math.max(0, input.institutionalScore));
  const technicalScore = Math.min(60, Math.max(0, input.technicalScore));
  const score = institutionalScore + technicalScore;

  let signal = classify(score);
  const hasSevereRisk = input.riskFlags.some((flag) => severeRiskFlags.has(flag));
  if (signal === "RISE_CONFIRMED" && hasSevereRisk) {
    signal = "EARLY_RISE";
  }

  return {
    symbol: input.symbol,
    date: input.date,
    score,
    signal,
    riskFlags: [...input.riskFlags],
    breakdown: {
      institutionalScore,
      technicalScore,
      ...(input.breakdown ?? {}),
    },
  };
}
