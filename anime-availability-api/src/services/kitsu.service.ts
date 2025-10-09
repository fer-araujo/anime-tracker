import axios from "axios";

const KITSU = "https://kitsu.io/api/edge";

export type KitsuAnime = {
  id: string;
  attributes: {
    canonicalTitle?: string;
    slug?: string;
    synopsis?: string | null;
    averageRating?: string | null; // string numérica
    startDate?: string | null;
    episodeCount?: number | null;
    subtype?: string | null; // TV, movie, etc.
    posterImage?: {
      tiny?: string; small?: string; medium?: string;
      large?: string; original?: string;
    } | null;
  };
};

export async function kitsuSearchAnime(
  title: string,
  limit = 1
): Promise<KitsuAnime | null> {
  if (!title?.trim()) return null;

  const fields =
    "canonicalTitle,slug,synopsis,averageRating,startDate,episodeCount,subtype,posterImage";

  const { data } = await axios.get(`${KITSU}/anime`, {
    params: {
      "filter[text]": title,
      "page[limit]": limit,
      "fields[anime]": fields
    }
  });

  const first = data?.data?.[0];
  if (!first) return null;
  return first as KitsuAnime;
}
