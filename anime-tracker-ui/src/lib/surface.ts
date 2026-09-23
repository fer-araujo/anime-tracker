import type { SurfaceHue } from "@/types/surface";

/** Space-separated HSL, the form `hsl(<value> / alpha)` accepts. */
export const SURFACE_HUES: Record<SurfaceHue, string> = {
  primary: "142 72% 45%", // --color-primary
  winter: "217 91% 60%",
  spring: "330 81% 60%",
  summer: "189 94% 43%",
  fall: "25 95% 53%",
};

const BY_SEASON: Record<string, SurfaceHue> = {
  WINTER: "winter",
  SPRING: "spring",
  SUMMER: "summer",
  FALL: "fall",
};

/** AniList's season name to its backdrop tone; anything unknown reads as brand. */
export function seasonHue(season: string | null | undefined): SurfaceHue {
  return BY_SEASON[(season ?? "").toUpperCase()] ?? "primary";
}
