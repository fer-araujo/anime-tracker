import axios from "axios";
import { ENV } from "../config/env.js";

export type AniListTitle = { romaji?: string | null; english?: string | null; native?: string | null };
export type AniListAnime = {
  id: number;
  title: AniListTitle;
  season?: "WINTER" | "SPRING" | "SUMMER" | "FALL" | null;
  seasonYear?: number | null;
  episodes?: number | null;
};

export type SeasonName = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export function getCurrentSeasonYear(date = new Date()): { season: SeasonName; year: number } {
  const month = date.getUTCMonth() + 1; // 1-12
  const year = date.getUTCFullYear();
  if (month <= 3) return { season: "WINTER", year };
  if (month <= 6) return { season: "SPRING", year };
  if (month <= 9) return { season: "SUMMER", year };
  return { season: "FALL", year };
}

export async function fetchSeasonAnime(params?: { season?: SeasonName; year?: number; page?: number; perPage?: number }): Promise<AniListAnime[]> {
  const { season, year } = params ?? {};
  const { season: fallbackSeason, year: fallbackYear } = getCurrentSeasonYear();

  const query = `
    query ($page:Int=1,$perPage:Int=50,$season:MediaSeason,$seasonYear:Int){
      Page(page:$page, perPage:$perPage){
        media(
          type: ANIME
          season: $season
          seasonYear: $seasonYear
          format_in:[TV,TV_SHORT]
          sort: POPULARITY_DESC
        ){
          id
          title { romaji english native }
          season
          seasonYear
          episodes
        }
      }
    }`;

  const variables = {
    page: params?.page ?? 1,
    perPage: params?.perPage ?? 50,
    season: season ?? fallbackSeason,
    seasonYear: year ?? fallbackYear
  };

  const { data } = await axios.post(
    ENV.ANILIST_URL,
    { query, variables },
    { headers: { "Content-Type": "application/json" } }
  );

  const list: AniListAnime[] = data?.data?.Page?.media ?? [];
  return list;
}
