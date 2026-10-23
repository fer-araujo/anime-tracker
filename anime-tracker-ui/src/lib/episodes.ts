import type { AiringInfo } from "@/types/anime";
import type { EpisodeNotification, EpisodeRange } from "@/types/notifications";

/**
 * "Episodio 5", "Episodios 1–12" or "Temporada completa".
 *
 * A whole season needs `from === 1`, `to === total` *and* more than one
 * episode: a one-episode special that aired is not a "full season", and
 * calling it one would read as a mistake.
 */
export function formatEpisodeRange(range: EpisodeRange): string {
  if (range.from === range.to) return `Episodio ${range.to}`;
  if (range.from === 1 && range.total !== null && range.to === range.total) {
    return "Temporada completa";
  }
  return `Episodios ${range.from}–${range.to}`;
}

/**
 * Wall-clock time in CDMX, "21:30".
 *
 * A fixed zone rather than the viewer's: "today" in this app is the CDMX day,
 * and the same string has to come out of the server render and the browser,
 * or the card hydrates with a mismatch.
 */
const CDMX_TIME = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  hour: "2-digit",
  minute: "2-digit",
  // `h23`, not `hour12: false`: the latter is h24 in some engines and prints
  // a broadcast at 00:30 as "24:30".
  hourCycle: "h23",
});

export function formatCdmxTime(iso: string): string {
  return CDMX_TIME.format(new Date(iso));
}

/**
 * The airing shelf's caption: "Episodios 1–10 · 01:00".
 *
 * Only the time, no "sale"/"salió": the shelf's payload is cached for up to
 * half an hour and rendered on the server, so a verb chosen against the clock
 * would be wrong for part of that time and differ between server and browser.
 * On a shelf titled "Emisión de Hoy" the time is the answer anyway.
 */
export function formatAiringCaption(airing: AiringInfo): string {
  const range =
    airing.range ??
    (airing.episode !== null
      ? { from: airing.episode, to: airing.episode, total: null }
      : null);
  const time = formatCdmxTime(airing.airingAt);
  return range ? `${formatEpisodeRange(range)} · ${time}` : time;
}

/** "hace 3 h", "hace 2 d" — enough precision for something that aired today. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

/**
 * Still due, as of `now`.
 *
 * The API's `upcoming` is true as of the request, and the bell keeps a response
 * for minutes. Checked against the clock as well, an episode moves to
 * "released" the minute it airs instead of at the next poll.
 */
export function isPending(n: EpisodeNotification, now: number): boolean {
  return n.upcoming && Date.parse(n.airedAt) > now;
}

/**
 * A notification as this client expects it, whatever API version answered.
 *
 * The UI (Vercel) and the API (Render) deploy separately, so for a while one
 * may be newer than the other. An older API sends no `range` and no `upcoming`
 * — and only ever sent released episodes — so both are recoverable.
 */
export function normalizeNotification(
  raw: Omit<EpisodeNotification, "range" | "upcoming"> &
    Partial<Pick<EpisodeNotification, "range" | "upcoming">>,
): EpisodeNotification {
  return {
    ...raw,
    range: raw.range ?? { from: raw.episode, to: raw.episode, total: null },
    upcoming: raw.upcoming ?? false,
  };
}
