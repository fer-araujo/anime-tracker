// src/controllers/schedule.controller.ts
import type { Request, Response, NextFunction } from "express";
import type { AniMedia } from "../types/animeCore.js";
import { hybridCache, setCacheControl } from "../utils/cache.js";
import { anilistFetch } from "../utils/anilistRateLimit.js";
import { formatAnimeList } from "../utils/formatAnimeList.js";
import { getCurrentSeasonYearLocal } from "../utils/season.js";
import {
  cdmxDateISO,
  cdmxDayIndex,
  cdmxDayName,
  cdmxRange,
  cdmxRangeBounds,
} from "../utils/cdmxCalendar.js";
import {
  AIRING_SCHEDULE_GQL,
  UPCOMING_MEDIA_GQL,
} from "../graphql/queries/schedule.gql.js";

const DEFAULT_COUNTRY = process.env.DEFAULT_COUNTRY || "MX";

/**
 * AniList caps `perPage` at 50 and a full week of airings runs to a couple of
 * hundred entries. The ceiling exists because this loop spends a global rate
 * limit slot per page: five pages is a comfortably full week without letting a
 * pathological response walk the limiter into starvation.
 */
const MAX_PAGES = 5;

type AiringSchedule = {
  media: AniMedia;
  airingAt?: number | null;
  episode?: number | null;
};

type FormattedAnime = Awaited<ReturnType<typeof formatAnimeList>>[number];

/** A formatted anime plus the specific broadcast this row is about. */
type AiringEntry = FormattedAnime & {
  airing: { episode: number | null; airingAt: string };
};

type DayGroup = {
  day: string;
  date: string;
  items: AiringEntry[];
};

function byRatingThenTitle(
  a: { title: string; meta?: { rating?: number | null } },
  b: { title: string; meta?: { rating?: number | null } },
): number {
  const ar = a.meta?.rating ?? -1;
  const br = b.meta?.rating ?? -1;
  if (br !== ar) return br - ar;
  return a.title.localeCompare(b.title);
}

/**
 * Whether AniList has committed to an actual air date.
 *
 * A year on its own is not a date. AniList happily reports `startDate: { year:
 * 2027 }` with no month for anything merely announced, which is exactly the
 * "TBA" bucket — so the month is the field that decides, not the year.
 */
function hasConfirmedDate(media: AniMedia): boolean {
  return typeof media.startDate?.month === "number";
}

async function fetchAllPages<T>(
  query: string,
  variables: Record<string, unknown>,
  extract: (json: {
    data?: {
      Page?: {
        pageInfo?: { hasNextPage?: boolean };
        media?: unknown[];
        airingSchedules?: unknown[];
      };
    };
  }) => { items: T[]; hasNextPage: boolean } | null,
): Promise<T[] | null> {
  const collected: T[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const json = await anilistFetch(query, { ...variables, page });
    if (!json) return page === 1 ? null : collected;

    const result = extract(json as never);
    if (!result) return page === 1 ? null : collected;

    collected.push(...result.items);
    if (!result.hasNextPage) break;
  }

  return collected;
}

/**
 * Format a set of schedule entries without enriching the same anime twice.
 *
 * `formatAnimeList` deduplicates by AniList id, which is right for a catalogue
 * and wrong for a broadcast log: a series airing twice in the same week is two
 * rows about one anime, and feeding the raw list through would silently drop
 * the second airing. So the media are made unique first, enriched once, then
 * each schedule entry is paired back with its formatted record. That also
 * halves the enrichment cost for those series instead of doubling it.
 */
async function formatSchedules(
  schedules: AiringSchedule[],
  country: string,
  season: string,
  year: number,
  level: "full" | "light",
): Promise<AiringEntry[]> {
  const uniqueMedia = new Map<number, AniMedia>();
  for (const s of schedules) {
    if (!s.media || s.media.isAdult) continue;
    if (!uniqueMedia.has(s.media.id)) uniqueMedia.set(s.media.id, s.media);
  }

  const formatted = await formatAnimeList(
    [...uniqueMedia.values()],
    country,
    season,
    year,
    level,
  );
  const byId = new Map(formatted.map((f) => [f.id.anilist, f]));

  const entries: AiringEntry[] = [];
  for (const s of schedules) {
    const record = s.media && byId.get(s.media.id);
    if (!record || typeof s.airingAt !== "number") continue;
    entries.push({
      ...record,
      airing: {
        episode: s.episode ?? null,
        airingAt: new Date(s.airingAt * 1000).toISOString(),
      },
    });
  }

  return entries;
}

function groupByDay(
  entries: AiringEntry[],
  firstDay: number,
  lastDay: number,
): DayGroup[] {
  const byDay = new Map<number, AiringEntry[]>();
  for (let d = firstDay; d <= lastDay; d++) byDay.set(d, []);

  for (const entry of entries) {
    const airingAtSeconds = Math.floor(
      new Date(entry.airing.airingAt).getTime() / 1000,
    );
    const bucket = byDay.get(cdmxDayIndex(airingAtSeconds));
    // A timestamp outside the requested window means AniList returned an entry
    // the filter should have excluded; drop it rather than inventing a column.
    if (bucket) bucket.push(entry);
  }

  return [...byDay.entries()].map(([dayIndex, items]) => ({
    day: cdmxDayName(dayIndex),
    date: cdmxDateISO(dayIndex),
    // Chronological within the day. ISO-8601 strings sort lexicographically in
    // the same order as the instants they name, so no parsing is needed.
    items: items.sort((a, b) =>
      a.airing.airingAt.localeCompare(b.airing.airingAt),
    ),
  }));
}

export async function getSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const type = (req.query.type as string) || "airing";
    const requestedDays = Number(req.query.days ?? 1);
    const days = requestedDays >= 7 ? 7 : 1;

    const cacheKey = type === "airing" ? `schedule:airing:${days}` : `schedule:${type}`;
    const cached = await hybridCache.get(cacheKey);
    if (cached) {
      setCacheControl(res, "schedule");
      return res.json(cached);
    }

    const { season, year } = getCurrentSeasonYearLocal();
    const country = DEFAULT_COUNTRY;

    if (type === "airing") {
      const { firstDay, lastDay } = cdmxRange(days);
      const { greater, lesser } = cdmxRangeBounds(firstDay, lastDay);

      const schedules = await fetchAllPages<AiringSchedule>(
        AIRING_SCHEDULE_GQL,
        { greater, lesser },
        (json) => {
          const page = json.data?.Page;
          if (!page) return null;
          return {
            items: (page.airingSchedules ?? []) as AiringSchedule[],
            hasNextPage: page.pageInfo?.hasNextPage ?? false,
          };
        },
      );

      if (!schedules) {
        return res.status(503).json({ error: "AniList unavailable" });
      }

      // A week is up to five times the work of a day and feeds a grid of
      // compact rows, not detail pages — the same trade the batch endpoint
      // already makes. Providers still resolve; only the paid fallback and the
      // per-item extras are skipped.
      const entries = await formatSchedules(
        schedules,
        country,
        season,
        year,
        days === 1 ? "full" : "light",
      );

      // The single-day shape predates the weekly grid and the home page still
      // consumes it, so `days=1` keeps returning a flat, rating-sorted array.
      // Only the new parameter gets the new shape.
      if (days === 1) {
        const payload = { data: [...entries].sort(byRatingThenTitle) };
        await hybridCache.set(cacheKey, payload, 1000 * 60 * 5);
        setCacheControl(res, "schedule");
        return res.json(payload);
      }

      const payload = {
        meta: { days, firstDate: cdmxDateISO(firstDay), lastDate: cdmxDateISO(lastDay) },
        data: groupByDay(entries, firstDay, lastDay),
      };
      await hybridCache.set(cacheKey, payload, 1000 * 60 * 30);
      setCacheControl(res, "schedule");
      return res.json(payload);
    }

    if (type === "coming" || type === "tba") {
      const media = await fetchAllPages<AniMedia>(
        UPCOMING_MEDIA_GQL,
        {},
        (json) => {
          const page = json.data?.Page;
          if (!page) return null;
          return {
            items: (page.media ?? []) as AniMedia[],
            hasNextPage: page.pageInfo?.hasNextPage ?? false,
          };
        },
      );

      if (!media) {
        return res.status(503).json({ error: "AniList unavailable" });
      }

      // Both types read the same AniList bucket and split it. "Coming soon"
      // that might arrive in three years is not coming soon, and a TBA list
      // padded with dated premieres is not a TBA list; mixing them was the
      // reason neither read as trustworthy.
      const filtered = media.filter((m) =>
        type === "coming" ? hasConfirmedDate(m) : !hasConfirmedDate(m),
      );

      const items = await formatAnimeList(filtered, country, season, year);
      items.sort(byRatingThenTitle);

      const payload = { data: items };
      await hybridCache.set(cacheKey, payload, 1000 * 60 * 30);
      setCacheControl(res, "schedule");
      return res.json(payload);
    }

    return res.status(400).json({ error: `Invalid type "${type}"` });
  } catch (err) {
    next(err);
  }
}
