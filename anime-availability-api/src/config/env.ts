import { config } from "dotenv";
config();

const required: string[] = ["PORT"];
for (const k of required) {
  if (!process.env[k]) {
    console.warn(`[env] Missing ${k} (using defaults if available)`);
  }
}

// Exporta tipos si quieres asegurar presence luego
export const ENV = {
  PORT: Number(process.env.PORT || 3000),
  TMDB_KEY: process.env.TMDB_KEY || "",
  ANILIST_URL: process.env.ANILIST_URL || "https://graphql.anilist.co",
  DEFAULT_COUNTRY: (process.env.DEFAULT_COUNTRY || "MX").toUpperCase()
} as const;
