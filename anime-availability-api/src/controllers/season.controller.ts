import { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env.js";
import { SeasonQuery } from "../models/schema.js";

// En el siguiente paso conectaremos AniList (season) + TMDb (providers)
export async function getSeason(req: Request, res: Response, next: NextFunction) {
  try {
    const { country, season, year } = (req.validated || {}) as SeasonQuery;
    const resolvedCountry = (country || ENV.DEFAULT_COUNTRY).toUpperCase();

    // placeholder: respuesta vacía por ahora
    res.json({
      country: resolvedCountry,
      season: season ?? null,
      year: year ?? null,
      items: []
    });
  } catch (e) {
    next(e);
  }
}
