import type { RadarAnalysis } from "../domain/types.js";

interface FirestoreDocLike {
  set(value: unknown): Promise<void>;
  collection(name: string): {
    doc(id: string): FirestoreDocLike;
  };
}

interface FirestoreLike {
  collection(name: string): {
    doc(id: string): FirestoreDocLike;
  };
}

export interface DailyRadarBuckets {
  top10: unknown[];
  watchlist: unknown[];
  overheated: unknown[];
  weakSignals: unknown[];
}

export class FirestoreRadarRepository {
  constructor(private readonly db: FirestoreLike) {}

  async saveDailyStockAnalysis(analysis: RadarAnalysis): Promise<void> {
    const stockRef = this.db.collection("stocks").doc(analysis.symbol);

    await stockRef.set({
      symbol: analysis.symbol,
      latestRadarScore: analysis.score,
      latestSignal: analysis.signal,
      latestRiskFlags: analysis.riskFlags,
      updatedAt: analysis.date,
    });

    await stockRef
      .collection("daily")
      .doc(analysis.date)
      .set(analysis);
  }

  async saveDailyRadar(date: string, buckets: DailyRadarBuckets): Promise<void> {
    await this.db
      .collection("radar")
      .doc(date)
      .set({
        ...buckets,
        generatedAt: date,
      });
  }
}
