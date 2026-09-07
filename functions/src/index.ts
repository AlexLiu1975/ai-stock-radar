import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { createRadarHttpHandler } from "./api/radarHttpHandler.js";
import { FirestoreRadarReader } from "./repositories/firestoreRadarReader.js";

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
