// src/controllers/provider.controller.ts
import type { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env.js";
import { getProvidersForAnime } from "../services/provider.service.js";

export async function getAnimeProviders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const rawId = req.params.anilistId;
    const anilistId = Number(rawId);

    if (!rawId || Number.isNaN(anilistId) || anilistId <= 0) {
      return res.status(400).json({ error: "Invalid anilistId" });
    }

    const country = (
      (req.query.country as string | undefined) ||
      ENV.DEFAULT_COUNTRY ||
      "MX"
    ).toUpperCase();

    const { title, tmdbId, providers } = await getProvidersForAnime(
      anilistId,
      country
    );

    return res.json({
      meta: {
        anilistId,
        tmdbId,
        title,
        country,
        total: providers.length,
        source: "AniList + TMDB",
      },
      data: providers, // ["Crunchyroll", "Netflix", ...]
    });
  } catch (err) {
    next(err);
  }
}
