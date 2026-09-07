import { getDailyRadar, type DailyRadarReader } from "./getDailyRadar.js";

interface RequestLike {
  query: Record<string, unknown>;
}

interface ResponseLike {
  status(code: number): ResponseLike;
  json(value: unknown): unknown;
}

export function createRadarHttpHandler(reader: DailyRadarReader) {
  return async function radarHttpHandler(
    req: RequestLike,
    res: ResponseLike,
  ): Promise<void> {
    const rawDate = req.query.date;
    const requestedDate = typeof rawDate === "string" ? rawDate : undefined;

    try {
      const radar = await getDailyRadar(reader, requestedDate);
      res.status(200).json(radar);
    } catch (error) {
      if (error instanceof Error && error.message === "RADAR_NOT_FOUND") {
        res.status(404).json({ error: "RADAR_NOT_FOUND" });
        return;
      }

      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  };
}
