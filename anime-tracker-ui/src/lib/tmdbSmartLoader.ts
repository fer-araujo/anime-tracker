
export function tmdbSmartLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // ¿Es una URL de TMDB tipo .../t/p/<size>/<path> ?
  const m = src.match(/https?:\/\/image\.tmdb\.org\/t\/p\/([^/]+)(\/.+)$/);
  if (!m) return src; // si no es TMDB, devuélvela tal cual

  const size = width <= 800 ? "w780" : width <= 1400 ? "w1280" : "original";
  const path = m[2]; // "/abcdef.jpg"
  const q = typeof quality === "number" ? quality : 85;
  return `https://image.tmdb.org/t/p/${size}${path}${q ? `?q=${q}` : ""}`;
}
