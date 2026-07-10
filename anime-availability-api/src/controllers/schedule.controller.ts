// src/controllers/schedule.controller.ts
import type { Request, Response, NextFunction } from "express";
import { hybridCache, setCacheControl } from "../utils/cache.js";
import { preferTitle } from "../utils/title.js";
import {
  AIRING_SCHEDULE_GQL,
  UPCOMING_MEDIA_GQL,
} from "../graphql/queries/schedule.gql.js";

const ANILIST_ENDPOINT =
  process.env.ANILIST_URL || "https://graphql.anilist.co";

/**
 * Compute CDMX (UTC-6) day bounds as Unix epoch seconds.
 * Start: midnight UTC-6 → 06:00 UTC
 * End:   23:59:59 UTC-6 → 05:59:59 UTC next day
 */
function getCDMXDayBounds(): { greater: number; lesser: number } {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const cdmxMs = utcMs - 6 * 3600000;
  const cdmxDate = new Date(cdmxMs);

  const y = cdmxDate.getUTCFullYear();
  const m = cdmxDate.getUTCMonth();
  const d = cdmxDate.getUTCDate();

  const greater = Math.floor(Date.UTC(y, m, d, 6, 0, 0) / 1000);
  const lesser = Math.floor(Date.UTC(y, m, d + 1, 5, 59, 59) / 1000);

  return { greater, lesser };
}

function mapMediaToScheduleItem(m: any, extra?: {
  episode?: number | null;
  airingAt?: number | null;
}) {
  return {
    id: { anilist: m.id, tmdb: null },
    title: preferTitle(m.title),
    providers: [],
    images: {
      poster: m.coverImage?.extraLarge ?? null,
      banner: m.bannerImage ?? null,
      backdrop: null,
      logo: null,
    },
    meta: {
      rating: m.averageScore
        ? Number((m.averageScore / 10).toFixed(1))
        : null,
      genres: m.genres ?? [],
      status: m.status,
      episodes: m.episodes,
      format: m.type,
      episode: extra?.episode ?? null,
      airingAt: extra?.airingAt ?? null,
    },
  };
}

export async function getSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const type = (req.query.type as string) || "airing";
    const cacheKey = `schedule:${type}`;

    const cached = await hybridCache.get<any>(cacheKey);
    if (cached) {
      setCacheControl(res, "schedule");
      return res.json(cached);
    }

    let items: any[] = [];

    if (type === "airing") {
      const { greater, lesser } = getCDMXDayBounds();

      const aniRes = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: AIRING_SCHEDULE_GQL,
          variables: { greater, lesser },
        }),
      });

      if (!aniRes.ok)
        return res.status(aniRes.status).json({ error: "AniList Error" });

      const json = await aniRes.json();
      const schedules =
        (json.data?.Page?.airingSchedules as any[]) ?? [];

      items = schedules.map((s: any) =>
        mapMediaToScheduleItem(s.media, {
          episode: s.episode,
          airingAt: s.airingAt,
        }),
      );
    } else if (type === "coming") {
      const aniRes = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: UPCOMING_MEDIA_GQL }),
      });

      if (!aniRes.ok)
        return res.status(aniRes.status).json({ error: "AniList Error" });

      const json = await aniRes.json();
      const media = (json.data?.Page?.media as any[]) ?? [];

      items = media.map((m: any) => mapMediaToScheduleItem(m));
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
