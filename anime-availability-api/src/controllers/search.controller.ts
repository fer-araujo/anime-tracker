import { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env.js";
import { SearchQuery } from "../models/schema.js";

// En el siguiente paso conectaremos TMDb providers y normalización
export async function searchTitle(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, country } = (req.validated || {}) as SearchQuery;
    const resolvedCountry = (country || ENV.DEFAULT_COUNTRY).toUpperCase();

    // placeholder: respuesta vacía por ahora
    res.json({
      query: title,
      country: resolvedCountry,
      result: null
    });
  } catch (e) {
    next(e);
  }
}
