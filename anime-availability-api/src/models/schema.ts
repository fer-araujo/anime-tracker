import { z } from "zod";

export const seasonQuerySchema = z.object({
  country: z
    .string()
    .length(2, "Country must be 2-letter code")
    .optional()
    .transform((v) => v?.toUpperCase()), // "mx" -> "MX"

  // MEJORA: Acepta minúsculas y mayúsculas, y normaliza a UPPERCASE
  season: z
    .enum([
      "WINTER", "SPRING", "SUMMER", "FALL",
      "winter", "spring", "summer", "fall"
    ])
    .optional()
    .transform((v) => v?.toUpperCase() as "WINTER" | "SPRING" | "SUMMER" | "FALL" | undefined),

  year: z.coerce.number().int().positive().optional(),

  // NUEVO: Esto es lo que faltaba para que funcione el Trending vs Popular
  rank: z.enum(["popular", "trending"]).optional(),
});

export const searchQuerySchema = z.object({
  title: z.string().min(1, "Title is required"),
  
  country: z
    .string()
    .length(2, "Country must be 2-letter code")
    .optional()
    .transform((v) => v?.toUpperCase()),

  // EXTRAS: Agregados para soportar los parámetros que envías desde el front (api.ts)
  limit: z.coerce.number().int().min(1).max(50).optional(),
  onlyAnime: z.coerce.boolean().optional(), // acepta "1", "true", 1, etc.
  enrich: z.coerce.boolean().optional(),
});

export type SeasonQuery = z.infer<typeof seasonQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;