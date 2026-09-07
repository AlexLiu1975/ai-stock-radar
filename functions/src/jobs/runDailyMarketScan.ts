import type { DailyBar, InstitutionalFlow, RadarAnalysis } from "../domain/types.js";
import type { MarketDataSource } from "../data/marketDataSource.js";
import type { DatedInstitutionalFlow, InstitutionalDataSource } from "../data/institutionalDataSource.js";
import type { StockUniverseSource } from "../data/stockUniverseSource.js";
import { analyzeDailyRadar } from "../pipeline/dailyRadar.js";
import type { FirestoreRadarRepository } from "../repositories/firestoreRadarRepository.js";
import { generateDailyRadar } from "./generateDailyRadar.js";

interface RadarWriter {
  saveDailyStockAnalysis(analysis: RadarAnalysis): Promise<void>;
  saveDailyRadar(date: string, buckets: ReturnType<typeof generateDailyRadar>): Promise<void>;
}

export interface DailyMarketScanOptions {
  targetDate: string;
  lookbackDays?: number;
  concurrency?: number;
  minimumBars?: number;
  minimumCoverage?: number;
  universe: StockUniverseSource;
  market: MarketDataSource;
  institutional: InstitutionalDataSource;
  repository: RadarWriter | FirestoreRadarRepository;
  analyzer?: (symbol: string, bars: DailyBar[], flows: InstitutionalFlow[]) => RadarAnalysis;
}

export interface DailyMarketScanResult {
  targetDate: string;
  discovered: number;
  analyzed: number;
  skipped: number;
  failed: Array<{ symbol: string; reason: string }>;
}

export async function runDailyMarketScan(options: DailyMarketScanOptions): Promise<DailyMarketScanResult> {
  const symbols = await options.universe.fetchSymbols();
  const analyses: RadarAnalysis[] = [];
  const failed: Array<{ symbol: string; reason: string }> = [];
  let skipped = 0;
  const from = subtractDays(options.targetDate, (options.lookbackDays ?? 90) - 1);
  const analyzer = options.analyzer ?? analyzeDailyRadar;

  await mapWithConcurrency(symbols, options.concurrency ?? 8, async (symbol) => {
    try {
      const [bars, datedFlows] = await Promise.all([
        options.market.fetchDailyBars(symbol, from, options.targetDate),
        options.institutional.fetchDailyFlows(symbol, from, options.targetDate),
      ]);

      if (bars.length < (options.minimumBars ?? 35) || bars.at(-1)?.date !== options.targetDate) {
        skipped += 1;
        return;
      }

      const flows = alignFlowsToBars(bars, datedFlows);
      const analysis = analyzer(symbol, bars, flows);
      await options.repository.saveDailyStockAnalysis(analysis);
      analyses.push(analysis);
    } catch (error) {
      failed.push({
        symbol,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  });

  const attempted = analyses.length + failed.length;
  const coverage = attempted === 0 ? 0 : analyses.length / attempted;
  if (analyses.length > 0 && coverage >= (options.minimumCoverage ?? 0.8)) {
    await options.repository.saveDailyRadar(options.targetDate, generateDailyRadar(analyses));
  }

  return {
    targetDate: options.targetDate,
    discovered: symbols.length,
    analyzed: analyses.length,
    skipped,
    failed,
  };
}

function alignFlowsToBars(bars: DailyBar[], flows: DatedInstitutionalFlow[]): InstitutionalFlow[] {
  const byDate = new Map(flows.map(({ date, ...flow }) => [date, flow]));
  return bars.map((bar) => byDate.get(bar.date) ?? { foreignNet: 0, trustNet: 0, dealerNet: 0 });
}

async function mapWithConcurrency<T>(
  values: T[],
  concurrency: number,
  worker: (value: T) => Promise<void>,
): Promise<void> {
  const limit = Math.max(1, Math.floor(concurrency));
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (next < values.length) {
      const value = values[next++];
      if (value !== undefined) await worker(value);
    }
  }));
}

function subtractDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}
