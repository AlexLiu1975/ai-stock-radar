import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { FirestoreRadarRepository } from "../../src/repositories/firestoreRadarRepository.js";
import { FirestoreRadarReader } from "../../src/repositories/firestoreRadarReader.js";
import { getDailyRadar } from "../../src/api/getDailyRadar.js";
import type { RadarAnalysis } from "../../src/domain/types.js";

const analysis: RadarAnalysis = {
  symbol: "2330",
  date: "2026-09-08",
  score: 88,
  signal: "RISE_CONFIRMED",
  riskFlags: [],
  breakdown: {
    institutionalScore: 35,
    technicalScore: 53,
  },
};

describe("Firestore radar emulator roundtrip", () => {
  let app: App;
  let db: Firestore;

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error("FIRESTORE_EMULATOR_HOST is required for emulator tests");
    }

    app = initializeApp({ projectId: "ai-stock-radar-test" }, `radar-test-${Date.now()}`);
    db = getFirestore(app);

    const existing = await db.listCollections();
    for (const collection of existing) {
      const snapshot = await collection.get();
      await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
    }
  });

  afterAll(async () => {
    if (app) await deleteApp(app);
  });

  it("writes daily radar and reads the same Top 10 back through the app read model", async () => {
    const repository = new FirestoreRadarRepository(db);
    const reader = new FirestoreRadarReader(db);

    await repository.saveDailyStockAnalysis(analysis);
    await repository.saveDailyRadar("2026-09-08", {
      top10: [analysis],
      watchlist: [],
      overheated: [],
      weakSignals: [],
    });

    const result = await getDailyRadar(reader, "2026-09-08");
    const savedStock = await db.collection("stocks").doc("2330").get();
    const savedDaily = await db
      .collection("stocks")
      .doc("2330")
      .collection("daily")
      .doc("2026-09-08")
      .get();

    expect(result.source).toBe("requested");
    expect(result.top10).toHaveLength(1);
    expect(result.top10[0]?.symbol).toBe("2330");
    expect(result.top10[0]?.breakdown).toEqual({
      institutionalScore: 35,
      technicalScore: 53,
    });
    expect(result.top10[0]?.riskFlags).toEqual([]);
    expect(savedStock.exists).toBe(true);
    expect(savedDaily.exists).toBe(true);
  });
});
