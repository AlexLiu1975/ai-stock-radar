export interface BacktestSignal {
  symbol: string;
  date: string;
  score: number;
  entryClose: number;
  futureCloses: number[];
}

export interface ScoreBandMetrics {
  count: number;
  average5dReturn: number;
  average10dReturn: number;
  hitRate3: number;
  hitRate5: number;
  maxDrawdown: number;
}

export interface BacktestMetrics extends ScoreBandMetrics {
  byScoreBand: Record<string, ScoreBandMetrics>;
}

export function evaluateSignals(signals: BacktestSignal[]): BacktestMetrics {
  if (signals.length === 0) {
    return {
      count: 0,
      average5dReturn: 0,
      average10dReturn: 0,
      hitRate3: 0,
      hitRate5: 0,
      maxDrawdown: 0,
      byScoreBand: {},
    };
  }

  const overall = summarize(signals);
  const grouped = new Map<string, BacktestSignal[]>();

  for (const signal of signals) {
    const band = scoreBand(signal.score);
    const bucket = grouped.get(band) ?? [];
    bucket.push(signal);
    grouped.set(band, bucket);
  }

  const byScoreBand: Record<string, ScoreBandMetrics> = {};
  for (const [band, bucket] of grouped.entries()) {
    byScoreBand[band] = summarize(bucket);
  }

  return {
    ...overall,
    byScoreBand,
  };
}

function summarize(signals: BacktestSignal[]): ScoreBandMetrics {
  const returns5 = signals.map((signal) => forwardReturn(signal, 5));
  const returns10 = signals.map((signal) => forwardReturn(signal, 10));
  const drawdowns = signals.map(maxSignalDrawdown);

  return {
    count: signals.length,
    average5dReturn: average(returns5),
    average10dReturn: average(returns10),
    hitRate3: fraction(returns10, (value) => value >= 0.03),
    hitRate5: fraction(returns10, (value) => value >= 0.05),
    maxDrawdown: Math.min(...drawdowns),
  };
}

function forwardReturn(signal: BacktestSignal, days: number): number {
  if (signal.entryClose <= 0) return 0;
  const index = Math.min(days, signal.futureCloses.length) - 1;
  if (index < 0) return 0;
  return (signal.futureCloses[index] - signal.entryClose) / signal.entryClose;
}

function maxSignalDrawdown(signal: BacktestSignal): number {
  if (signal.entryClose <= 0 || signal.futureCloses.length === 0) return 0;
  let worst = 0;
  for (const close of signal.futureCloses) {
    const drawdown = (close - signal.entryClose) / signal.entryClose;
    worst = Math.min(worst, drawdown);
  }
  return worst;
}

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function fraction(values: number[], predicate: (value: number) => boolean): number {
  if (values.length === 0) return 0;
  return values.filter(predicate).length / values.length;
}

function scoreBand(score: number): string {
  if (score >= 80) return "80-100";
  if (score >= 65) return "65-79";
  if (score >= 50) return "50-64";
  return "0-49";
}
