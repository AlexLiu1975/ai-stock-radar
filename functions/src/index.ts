import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { createRadarHttpHandler } from "./api/radarHttpHandler.js";
import { TwseInstitutionalDataSource } from "./data/institutionalDataSource.js";
import { TwseMarketDataSource } from "./data/marketDataSource.js";
import { TwseStockUniverseSource } from "./data/stockUniverseSource.js";
import { runDailyMarketScan } from "./jobs/runDailyMarketScan.js";
import { createScheduledRadarScan } from "./jobs/scheduledRadarScan.js";
import { FirestoreRadarReader } from "./repositories/firestoreRadarReader.js";
import { FirestoreRadarRepository } from "./repositories/firestoreRadarRepository.js";

initializeApp();

const reader = new FirestoreRadarReader(getFirestore());
const handler = createRadarHttpHandler(reader);

export const apiRadar = onRequest(
  {
    region: "asia-east1",
    cors: true,
  },
  async (req, res) => {
    await handler(req, res);
  },
);

const scheduledScan = createScheduledRadarScan(async (targetDate) => {
  return runDailyMarketScan({
    targetDate,
    lookbackDays: 90,
    concurrency: 8,
    minimumBars: 35,
    minimumCoverage: 0.8,
    universe: new TwseStockUniverseSource(),
    market: new TwseMarketDataSource(),
    institutional: new TwseInstitutionalDataSource(),
    repository: new FirestoreRadarRepository(getFirestore()),
  });
});

export const dailyRadarScan = onSchedule(
  {
    schedule: "0 18 * * 1-5",
    timeZone: "Asia/Taipei",
    region: "asia-east1",
    timeoutSeconds: 540,
    memory: "1GiB",
    retryCount: 2,
  },
  async (event) => {
    const result = await scheduledScan(event.scheduleTime);
    logger.info("Daily market scan completed", result);

    if (result.analyzed === 0 && result.failed.length > 0) {
      throw new Error(`Daily market scan failed for all attempted symbols on ${result.targetDate}`);
    }
  },
);
