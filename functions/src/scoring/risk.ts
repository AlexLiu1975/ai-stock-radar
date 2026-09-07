import type { DailyBar, InstitutionalFlow, KDPoint, MACDPoint, RiskFlag } from "../domain/types.js";

export function detectRiskFlags(
  bars: DailyBar[],
  kd: KDPoint[],
  macd: MACDPoint[],
  flows: InstitutionalFlow[],
): RiskFlag[] {
  const flags = new Set<RiskFlag>();
  const latestBar = bars.at(-1);
  const previousBar = bars.at(-2);
  const latestKd = kd.at(-1);
  const latestMacd = macd.at(-1);
  const latestFlow = flows.at(-1);

  if (latestKd && (latestKd.k > 80 || latestKd.d > 80)) {
    flags.add("OVERHEATED_KD");
  }

  if (latestBar) {
    const bodyHigh = Math.max(latestBar.open, latestBar.close);
    const body = Math.abs(latestBar.close - latestBar.open);
    const range = latestBar.high - latestBar.low;
    const upperShadow = latestBar.high - bodyHigh;
    if (range > 0 && upperShadow >= Math.max(body * 2, range * 0.4)) {
      flags.add("LONG_UPPER_SHADOW");
    }

    if (latestBar.volume < 100_000) {
      flags.add("LOW_LIQUIDITY");
    }
  }

  if (bars.length >= 6 && latestBar) {
    const base = bars.at(-6)!;
    const fiveDayRise = base.close > 0 ? (latestBar.close - base.close) / base.close : 0;
    if (fiveDayRise >= 0.15) {
      flags.add("EXTENDED_PRICE");
    }
  }

  if (bars.length >= 6 && latestBar) {
    const history = bars.slice(-6, -1);
    const averageVolume = history.reduce((sum, bar) => sum + bar.volume, 0) / history.length;
    if (
      averageVolume > 0 &&
      latestBar.volume >= averageVolume * 2.5 &&
      previousBar &&
      latestBar.close <= previousBar.close * 1.01
    ) {
      flags.add("VOLUME_EXHAUSTION");
    }
  }

  if (latestBar && previousBar && latestFlow) {
    const institutionalNet = latestFlow.foreignNet + latestFlow.trustNet + latestFlow.dealerNet;
    if (institutionalNet > 0 && latestBar.close < previousBar.close) {
      flags.add("INSTITUTIONAL_DIVERGENCE");
    }
  }

  if (latestMacd && latestBar && bars.length >= 20) {
    const recent = bars.slice(-20);
    const averageClose = recent.reduce((sum, bar) => sum + bar.close, 0) / recent.length;
    const priceExtension = averageClose > 0 ? (latestBar.close - averageClose) / averageClose : 0;
    if (latestMacd.osc > 0 && priceExtension > 0.12) {
      flags.add("EXTENDED_PRICE");
    }
  }

  return [...flags];
}
