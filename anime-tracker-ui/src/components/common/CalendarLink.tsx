"use client";

import Link from "next/link";
import { cdmxDayOfMonth } from "@/lib/calendar";
import { useUserListsContext } from "@/providers/UserListsProvider";

/**
 * The way into the calendar, shown once there is something to put in it.
 *
 * Conditional, unlike the Recomendaciones link: that page teaches how to fill
 * itself, while a calendar with no anime has nothing to teach, and a heart with
 * no status does not count as following something.
 *
 * Drawn with boxes rather than the Calendar icon because that glyph is solid and
 * a number on top of it would not read. The number is the point: it says what
 * this button is about before anyone opens it, and sets it apart from the bell.
 */
export function CalendarLink() {
  const { statusByAnimeId } = useUserListsContext();
  if (statusByAnimeId.size === 0) return null;

  return (
    <Link
      href="/calendar"
      aria-label="Calendario"
      title="Calendario"
      className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span
        aria-hidden="true"
        className="flex w-5 h-5 flex-col overflow-hidden rounded-[4px] border-[1.5px] border-current"
      >
        <span className="h-1 shrink-0 bg-current" />
        <span className="flex flex-1 items-center justify-center text-2xs font-bold leading-none tabular-nums">
          {cdmxDayOfMonth()}
        </span>
      </span>
    </Link>
  );
}
