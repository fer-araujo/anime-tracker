// src/controllers/schedule.controller.ts
import type { Request, Response, NextFunction } from "express";
import { hybridCache, setCacheControl } from "../utils/cache.js";
import { preferTitle } from "../utils/title.js";
import {
  AIRING_TODAY_GQL,
  COMING_SOON_GQL,
} from "../graphql/queries/schedule.gql.js";

const ANILIST_ENDPOINT =
  process.env.ANILIST_URL || "https://graphql.anilist.co";

/**
 * Calculate today's start/end Unix timestamps for CDMX (UTC-6).
 */
function getCdmxDayBounds(): { greater: number; lesser: number } {
  const now = new Date();
  const offset = now.getTimezoneOffset(); // local offset in minutes
  const cdmxOffsetMinutes = -6 * 60; // UTC-6
  const diff = cdmxOffsetMinutes - offset;
  const cdmxNow = new Date(now.getTime() + diff * 60000);

  // Start of CDMX day as epoch seconds
  const cdmxStart = new Date(
    Date.UTC(cdmxNow.getFullYear(), cdmxNow.getMonth(), cdmxNow.getDate()),
  );
  const greater = Math.floor(cdmxStart.getTime() / 1000);
  const lesser = greater + 86400;

  return { greater, lesser };
}

function mapScheduleItem(m: any): Record<string, unknown> | null {
  const item = {
    id: { anilist: m.id, tmdb: null },
    title: preferTitle(m.title),
    images: {
      poster: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
      banner: m.bannerImage ?? null,
    },
    meta: {
      rating: m.averageScore
        ? Number((m.averageScore / 10).toFixed(1))
        : null,
      genres: m.genres?.slice(0, 3) ?? [],
      status: m.status,
      episodes: m.episodes ?? null,
      format: m.format ?? null,
    },
  };
  return item;
}

export async function getSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const type = (req.query.type as string) || "airing";
    const cacheKey =
      type === "upcoming" ? "home:schedule:upcoming" : "home:schedule:airing";

    const cached = await hybridCache.get<any>(cacheKey);
    if (cached) return res.json(cached);

    let items: Record<string, unknown>[] = [];

    if (type === "upcoming") {
      const aniRes = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: COMING_SOON_GQL }),
      });

      if (!aniRes.ok)
        return res.status(aniRes.status).json({ error: "AniList Error" });

      const json = await aniRes.json();
      const media = json.data?.Page?.media || [];
      items = media.map(mapScheduleItem).filter(Boolean) as Record<
        string,
        unknown
      >[];
    } else {
      const { greater, lesser } = getCdmxDayBounds();
      const aniRes = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: AIRING_TODAY_GQL,
          variables: { greater, lesser },
        }),
      });

      if (!aniRes.ok)
        return res.status(aniRes.status).json({ error: "AniList Error" });

      const json = await aniRes.json();
      const schedules = json.data?.Page?.airingSchedules || [];

      items = schedules
        .map((s: any) => {
          const base = mapScheduleItem(s.media);
          if (!base) return null;
          return {
            ...base,
            meta: {
              ...(base.meta as Record<string, unknown>),
              episode: s.episode,
              airingAt: s.airingAt,
            },
          };
        })
        .filter(Boolean) as Record<string, unknown>[];
    }

    const payload = { data: items };
    await hybridCache.set(cacheKey, payload, 1000 * 60 * 5);
    setCacheControl(res, "season");
    return res.json(payload);
  } catch (err) {
    next(err);
  }
}
