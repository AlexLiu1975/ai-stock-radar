export interface DailyRadarDocument {
  generatedAt: string;
  top10: unknown[];
  watchlist: unknown[];
  overheated: unknown[];
  weakSignals: unknown[];
}

export interface DailyRadarReader {
  getByDate(date: string): Promise<DailyRadarDocument | null>;
  getLatest(): Promise<DailyRadarDocument | null>;
}

export interface DailyRadarReadModel extends DailyRadarDocument {
  date: string;
  source: "requested" | "latest" | "latest-fallback";
}

export async function getDailyRadar(
  reader: DailyRadarReader,
  requestedDate?: string,
): Promise<DailyRadarReadModel> {
  if (requestedDate) {
    const requested = await reader.getByDate(requestedDate);
    if (requested) {
      return {
        ...requested,
        date: requested.generatedAt,
        source: "requested",
      };
    }

    const latest = await reader.getLatest();
    if (!latest) throw new Error("RADAR_NOT_FOUND");

    return {
      ...latest,
      date: latest.generatedAt,
      source: "latest-fallback",
    };
  }

  const latest = await reader.getLatest();
  if (!latest) throw new Error("RADAR_NOT_FOUND");

  return {
    ...latest,
    date: latest.generatedAt,
    source: "latest",
  };
}
