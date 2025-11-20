import { Anime } from "./anime";

export type SeasonResp = {
  meta: { country: string; season: string; year: number; total: number; source: string };
  data: Anime[];
};