import type { DailyRadarDocument, DailyRadarReader } from "../api/getDailyRadar.js";

interface SnapshotLike {
  exists: boolean;
  data(): unknown;
}

interface QuerySnapshotLike {
  empty: boolean;
  docs: Array<{ data(): unknown }>;
}

interface RadarCollectionLike {
  doc(id: string): {
    get(): Promise<SnapshotLike>;
  };
  orderBy(field: string, direction: "asc" | "desc"): {
    limit(count: number): {
      get(): Promise<QuerySnapshotLike>;
    };
  };
}

interface FirestoreLike {
  collection(name: string): RadarCollectionLike;
}

export class FirestoreRadarReader implements DailyRadarReader {
  constructor(private readonly db: FirestoreLike) {}

  async getByDate(date: string): Promise<DailyRadarDocument | null> {
    const snapshot = await this.db.collection("radar").doc(date).get();
    if (!snapshot.exists) return null;
    return snapshot.data() as DailyRadarDocument;
  }

  async getLatest(): Promise<DailyRadarDocument | null> {
    const snapshot = await this.db
      .collection("radar")
      .orderBy("generatedAt", "desc")
      .limit(1)
      .get();

    if (snapshot.empty || snapshot.docs.length === 0) return null;
    return snapshot.docs[0]!.data() as DailyRadarDocument;
  }
}
