import { describe, expect, it } from "vitest";
import type { RadarAnalysis } from "../../src/domain/types.js";
import { FirestoreRadarRepository } from "../../src/repositories/firestoreRadarRepository.js";

class FakeDocRef {
  writes: unknown[] = [];
  children = new Map<string, FakeDocRef>();

  async set(value: unknown): Promise<void> {
    this.writes.push(value);
  }

  collection(name: string) {
    return {
      doc: (id: string) => {
        const key = `${name}/${id}`;
        if (!this.children.has(key)) this.children.set(key, new FakeDocRef());
        return this.children.get(key)!;
      },
    };
  }
}

class FakeFirestore {
  roots = new Map<string, FakeDocRef>();

  collection(name: string) {
    return {
      doc: (id: string) => {
        const key = `${name}/${id}`;
        if (!this.roots.has(key)) this.roots.set(key, new FakeDocRef());
        return this.roots.get(key)!;
      },
    };
  }
}

describe("FirestoreRadarRepository", () => {
  it("stores stock summary and daily analysis in stable paths", async () => {
    const db = new FakeFirestore();
    const repository = new FirestoreRadarRepository(db);
    const analysis: RadarAnalysis = {
      symbol: "2330",
      date: "2026-09-07",
      score: 82,
      signal: "RISE_CONFIRMED",
      riskFlags: [],
      breakdown: { institutional: 36, technical: 46 },
    };

    await repository.saveDailyStockAnalysis(analysis);

    const stock = db.roots.get("stocks/2330")!;
    expect(stock.writes.at(-1)).toMatchObject({
      symbol: "2330",
      latestRadarScore: 82,
      latestSignal: "RISE_CONFIRMED",
      updatedAt: "2026-09-07",
    });

    const daily = stock.children.get("daily/2026-09-07")!;
    expect(daily.writes.at(-1)).toEqual(analysis);
  });

  it("stores daily radar buckets", async () => {
    const db = new FakeFirestore();
    const repository = new FirestoreRadarRepository(db);

    await repository.saveDailyRadar("2026-09-07", {
      top10: [{ symbol: "2330", score: 82 }],
      watchlist: [],
      overheated: [{ symbol: "3017", score: 90 }],
      weakSignals: [],
    });

    expect(db.roots.get("radar/2026-09-07")!.writes.at(-1)).toMatchObject({
      top10: [{ symbol: "2330", score: 82 }],
      overheated: [{ symbol: "3017", score: 90 }],
      generatedAt: "2026-09-07",
    });
  });
});
