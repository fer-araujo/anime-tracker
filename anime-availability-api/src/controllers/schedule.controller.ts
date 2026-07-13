// src/controllers/schedule.controller.ts
import type { Request, Response, NextFunction } from "express";
import type { AniMedia } from "../types/animeCore.js";
import { hybridCache, setCacheControl } from "../utils/cache.js";
import { anilistFetch } from "../utils/anilistRateLimit.js";
import { formatAnimeList } from "../utils/formatAnimeList.js";
import { getCurrentSeasonYearLocal } from "../utils/season.js";
import {
  AIRING_SCHEDULE_GQL,
  UPCOMING_MEDIA_GQL,
} from "../graphql/queries/schedule.gql.js";

const DEFAULT_COUNTRY = process.env.DEFAULT_COUNTRY || "MX";

interface AiringSchedule {
  media: AniMedia;
  airingAt?: number;
  episode?: number;
}

/**
 * Compute CDMX (UTC-6) day bounds as Unix epoch seconds.
 * Start: midnight UTC-6 → 06:00 UTC
 * End:   23:59:59 UTC-6 → 05:59:59 UTC next day
 *
 * `Date.now()` is already UTC. CDMX = UTC-6, so we subtract 6 hours
 * to get the current wall-clock date in CDMX regardless of server TZ.
 */
function getCDMXDayBounds(): { greater: number; lesser: number } {
  const cdmxMs = Date.now() - 6 * 3600000;
  const cdmxDate = new Date(cdmxMs);

  const y = cdmxDate.getUTCFullYear();
  const m = cdmxDate.getUTCMonth();
  const d = cdmxDate.getUTCDate();

  const greater = Math.floor(Date.UTC(y, m, d, 6, 0, 0) / 1000);
  const lesser = Math.floor(Date.UTC(y, m, d + 1, 5, 59, 59) / 1000);

  return { greater, lesser };
}

export async function getSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const type = (req.query.type as string) || "airing";
    const cacheKey = `schedule:${type}`;

    const cached = await hybridCache.get<{ data: unknown[] }>(cacheKey);
    if (cached) {
      setCacheControl(res, "schedule");
      return res.json(cached);
    }

    const { season, year } = getCurrentSeasonYearLocal();
    const country = DEFAULT_COUNTRY;
    let items: Array<{ title: string; meta?: { rating?: number | null } }> = [];

    if (type === "airing") {
      const { greater, lesser } = getCDMXDayBounds();

      const aniJson = await anilistFetch(AIRING_SCHEDULE_GQL, { greater, lesser });
      if (!aniJson)
        return res.status(503).json({ error: "AniList unavailable" });

      const schedules =
        (aniJson.data?.Page?.airingSchedules as AiringSchedule[]) ?? [];

      let rawMedia: AniMedia[] = schedules.map((s) => s.media);
      rawMedia = rawMedia.filter((m) => !m.isAdult);
      items = await formatAnimeList(rawMedia, country, season, year);

      // Ordenar por rating (mejor → peor), como en season controller
      items.sort((a, b) => {
        const ar = a.meta?.rating ?? -1;
        const br = b.meta?.rating ?? -1;
        if (br !== ar) return br - ar;
        return a.title.localeCompare(b.title);
      });
    } else if (type === "coming") {
      const aniJson = await anilistFetch(UPCOMING_MEDIA_GQL, {});
      if (!aniJson)
        return res.status(503).json({ error: "AniList unavailable" });

      const rawMedia = (aniJson.data?.Page?.media as AniMedia[]) ?? [];

      items = await formatAnimeList(rawMedia, country, season, year);

      // Ordenar por rating (mejor → peor), como en season controller
      items.sort((a, b) => {
        const ar = a.meta?.rating ?? -1;
        const br = b.meta?.rating ?? -1;
        if (br !== ar) return br - ar;
        return a.title.localeCompare(b.title);
      });
    } else {
      return res.status(400).json({ error: `Invalid type "${type}"` });
    }

    const payload = { data: items };
    await hybridCache.set(cacheKey, payload, 1000 * 60 * 5);
    setCacheControl(res, "schedule");
    return res.json(payload);
  } catch (err) {
    next(err);
  }
}
