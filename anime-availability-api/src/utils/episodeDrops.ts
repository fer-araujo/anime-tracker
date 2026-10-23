import type { EpisodeRange, SameDayDrop } from "../types/notifications.js";
import { cdmxDayIndex } from "./cdmxCalendar.js";

/**
 * One row per series per CDMX day, however many episodes it released.
 *
 * A season dropped at once reaches us in two shapes. AniList lists every
 * episode as its own airing at the same instant — Cyberpunk: Edgerunners 2 is
 * ten `airingSchedules` on 2026-10-20 — and the "Emisión de Hoy" shelf showed
 * the same card ten times. AnimeSchedule sends one row carrying a range, which
 * the caller turns into `range` before it gets here. Either way the question a
 * viewer asks is "did it come out today, and how much of it", so the rows are
 * merged into one whose range spans them all.
 *
 * The merged row keeps everything else from its earliest member, including
 * `airingAt`: the moment the first episode was available is when the release
 * happened. Groups come back in the order their first member appeared, so a
 * caller's own sort still holds.
 *
 * The range is assumed contiguous. Episodes 1, 2 and 5 on the same day would
 * read as 1–5; no source measured does that, and inventing a gap list for it
 * would cost every caller a shape nothing renders.
 */
export function collapseSameDayDrops<T extends SameDayDrop>(rows: T[]): T[] {
  const groups = new Map<string, T>();

  for (const row of rows) {
    const key = `${row.anilistId}:${cdmxDayIndex(row.airingAt)}`;
    const held = groups.get(key);
    if (!held) {
      groups.set(key, row);
      continue;
    }

    const earliest = row.airingAt < held.airingAt ? row : held;
    groups.set(key, {
      ...earliest,
      // Sound: the merge is null only when both inputs are, so a caller whose
      // rows always carry a range gets one back.
      range: mergeRanges(held.range, row.range) as T["range"],
    });
  }

  return [...groups.values()];
}

function mergeRanges(
  a: EpisodeRange | null,
  b: EpisodeRange | null,
): EpisodeRange | null {
  // An unnumbered row adds nothing to a numbered one: it is the same release
  // seen by a source that could not count it.
  if (!a) return b;
  if (!b) return a;
  return {
    from: Math.min(a.from, b.from),
    to: Math.max(a.to, b.to),
    total: a.total ?? b.total,
  };
}
