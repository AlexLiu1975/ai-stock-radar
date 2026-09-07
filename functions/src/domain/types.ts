export interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface InstitutionalFlow {
  foreignNet: number;
  trustNet: number;
  dealerNet: number;
}

export interface KDPoint {
  date: string;
  rsv: number;
  k: number;
  d: number;
}

export interface MACDPoint {
  date: string;
  dif: number;
  dea: number;
  osc: number;
}

export type RiskFlag =
  | "OVERHEATED_KD"
  | "EXTENDED_PRICE"
  | "LONG_UPPER_SHADOW"
  | "VOLUME_EXHAUSTION"
  | "INSTITUTIONAL_DIVERGENCE"
  | "LOW_LIQUIDITY";

export type RadarSignal =
  | "RISE_CONFIRMED"
  | "EARLY_RISE"
  | "WATCH"
  | "WEAK";

export interface RadarAnalysis {
  symbol: string;
  date: string;
  score: number;
  signal: RadarSignal;
  riskFlags: RiskFlag[];
  breakdown: Record<string, number>;
}
