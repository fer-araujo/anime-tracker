import { z } from "zod";

export const seasonQuerySchema = z.object({
  country: z
    .string()
    .length(2, "country must be 2-letter code")
    .optional()
    .transform((v) => v?.toUpperCase()),
  season: z.enum(["WINTER", "SPRING", "SUMMER", "FALL"]).optional(),
  year: z.coerce.number().int().positive().optional()
});

export const searchQuerySchema = z.object({
  title: z.string().min(1, "title is required"),
  country: z
    .string()
    .length(2, "country must be 2-letter code")
    .optional()
    .transform((v) => v?.toUpperCase())
});

export type SeasonQuery = z.infer<typeof seasonQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
