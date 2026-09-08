import { describe, expect, it } from "vitest";
import { FirestoreRadarReader } from "../../src/repositories/firestoreRadarReader.js";

const radarDoc = {
  generatedAt: "2026-09-07",
  top10: [],
  watchlist: [],
  overheated: [],
  weakSignals: [],
};

describe("FirestoreRadarReader", () => {
  it("reads radar by exact date", async () => {
    const db = fakeDb({ "2026-09-07": radarDoc });
    const reader = new FirestoreRadarReader(db);

    await expect(reader.getByDate("2026-09-07")).resolves.toEqual(radarDoc);
    await expect(reader.getByDate("2026-09-08")).resolves.toBeNull();
  });

  it("reads the latest radar document", async () => {
    const db = fakeDb({
      "2026-09-06": { ...radarDoc, generatedAt: "2026-09-06" },
      "2026-09-07": radarDoc,
    });
    const reader = new FirestoreRadarReader(db);

    await expect(reader.getLatest()).resolves.toEqual(radarDoc);
  });
});

function fakeDb(records: Record<string, typeof radarDoc>) {
  return {
    collection(name: string) {
      if (name !== "radar") throw new Error("unexpected collection");
      return {
        doc(id: string) {
          return {
            async get() {
              const data = records[id];
              return {
                exists: Boolean(data),
                data: () => data,
              };
            },
          };
        },
        orderBy() {
          return {
            limit() {
              return {
                async get() {
                  const latest = Object.values(records).sort((a, b) =>
                    b.generatedAt.localeCompare(a.generatedAt),
                  )[0];
                  return {
                    empty: !latest,
                    docs: latest
                      ? [{ data: () => latest }]
                      : [],
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}
