import { z } from "zod";
import type { Anime } from "./anime";

export type SeasonResp = {
  meta: {
    country: string;
    season: string;
    year: number;
    total: number;
    source: string;
  };
  data: Anime[];
  /** Still-airing series from an earlier season; see SeasonRespSchema below. */
  leftovers: Anime[];
};

/* -------------------------------------------------------------------------- */
/*  HeroResponse Zod Schema                                                  */
/* -------------------------------------------------------------------------- */

const HeroItemSchema = z.object({
  id: z.object({
    anilist: z.number(),
    tmdb: z.number().nullable(),
  }),
  title: z.string(),
  images: z.object({
    backdrop: z.string().nullable(),
    banner: z.string().nullable(),
    logo: z.string().nullable(),
    poster: z.string().nullable(),
  }),
  meta: z.object({
    synopsis: z.string().nullable(),
    synopsisShort: z.string().nullable(),
    year: z.number().nullable(),
    rating: z.number().nullable(),
    genres: z.array(z.string()),
    status: z.string().nullable(),
    episodes: z.number().nullable(),
    type: z.string().nullable(),
    studio: z.string().nullable(),
    trailer: z.string().nullable(),
  }),
});

export const HeroResponseSchema = z.object({
  data: z.array(HeroItemSchema),
});

export type HeroResponse = z.infer<typeof HeroResponseSchema>;

/* -------------------------------------------------------------------------- */
/*  SeasonResp Schema                                                         */
/* -------------------------------------------------------------------------- */

export const SeasonRespSchema = z.object({
  meta: z.object({
    country: z.string().optional().default(""),
    season: z.string().optional().default(""),
    year: z.number().optional().default(0),
    total: z.number().optional().default(0),
    source: z.string().optional().default(""),
  }),
  data: z.array(z.any()),
  // Series still airing from an earlier season. Defaulted rather than required:
  // the key only appeared with the season-density release, and a client that
  // insists on it would reject every cached response older than that.
  leftovers: z.array(z.any()).optional().default([]),
});

/* -------------------------------------------------------------------------- */
/*  Schedule — loose validation (items come enriched from formatAnimeList)    */
/* -------------------------------------------------------------------------- */

export const ScheduleResponseSchema = z.object({
  data: z.array(z.any()),
});
