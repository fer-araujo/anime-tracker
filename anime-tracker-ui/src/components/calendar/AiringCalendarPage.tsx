"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DayPicker } from "@/components/calendar/DayPicker";
import { WeekGrid } from "@/components/calendar/WeekGrid";
import { ActionButton } from "@/components/common/Buttons";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterChips } from "@/components/common/FilterChips";
import { SurfaceBackdrop } from "@/components/common/SurfaceBackdrop";
import Icon from "@/components/custom/Icon";
import Skeleton from "@/components/custom/Skeleton";
import { useAiringCalendar } from "@/hooks/useAiringCalendar";
import {
  calendarHref,
  calendarStatusChips,
  filterCalendarByStatus,
  formatWeekRange,
  isWeekEmpty,
  normalizeCalendarWeek,
  normalizeStatusFilter,
  pickInitialDay,
  resolveCalendarView,
  shiftCalendarWeek,
} from "@/lib/calendar";
import { useAuth } from "@/providers/AuthProvider";
import type { CalendarStatusFilter, CalendarWeek } from "@/types/calendar";

/**
 * Everything the user has given a status that airs this week.
 *
 * The week and the status filter live in the URL so they survive a refresh, as
 * the view and format do on the season page. The day selected on a phone does
 * not: it is a place in the page, and nobody shares a link to mean "scrolled
 * to Thursday".
 */
export function AiringCalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const week = normalizeCalendarWeek(searchParams.get("week"));
  const requestedStatus = normalizeStatusFilter(searchParams.get("status"));
  const { calendar, failed, loading, retry, hasTrackedAnime, statusByAnimeId } =
    useAiringCalendar(week);
  const [pickedDay, setPickedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?redirect=/calendar");
  }, [authLoading, user, router]);

  if (!authLoading && !user) return null;

  const view = resolveCalendarView({
    loading: authLoading || loading,
    hasTrackedAnime,
    failed,
    hasCalendar: calendar !== null,
  });
  const shown = view === "ready" ? calendar : null;
  const allDays = shown?.data ?? [];
  const today = shown?.meta.today ?? null;

  const chips = calendarStatusChips(allDays, statusByAnimeId);
  // A filter carried over from a week where that status had something: with no
  // chip to show it selected, it would hide everything with no visible reason.
  const status = chips.some((c) => c.key === requestedStatus)
    ? requestedStatus
    : "all";
  const days = filterCalendarByStatus(allDays, statusByAnimeId, status);
  // Derived rather than stored: a picked day from another week simply stops
  // matching, and the page falls back to the default without an extra render.
  const selected = days.some((d) => d.date === pickedDay)
    ? pickedDay
    : pickInitialDay(days, today);

  const navigate = (nextWeek: CalendarWeek, nextStatus: CalendarStatusFilter) =>
    router.replace(calendarHref(nextWeek, nextStatus), { scroll: false });
  // The URL's filter, not the one on screen: while a week loads, or in a week
  // without that status, the screen shows everything, and carrying that along
  // would lose the filter for the weeks that do have it.
  const goToWeek = (next: CalendarWeek) => {
    setPickedDay(null);
    navigate(next, requestedStatus);
  };

  return (
    <div className="relative min-h-screen pb-16">
      <SurfaceBackdrop />
      <main className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-10 lg:px-16 xl:px-10 pt-24 md:pt-32 flex flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Mi calendario
            </h1>
            <p className="text-sm text-white/70">
              {shown
                ? `${formatWeekRange(shown.meta.firstDate, shown.meta.lastDate)}. `
                : null}
              Horario del centro de México.
            </p>
          </div>
          <nav className="flex items-center gap-2" aria-label="Cambiar de semana">
            <ActionButton
              variant="soft"
              size="md"
              onClick={() => goToWeek(shiftCalendarWeek(week, -1))}
              disabled={week === -1}
              ariaLabel="Semana anterior"
            >
              <Icon name="ChevronLeft" size={16} />
            </ActionButton>
            <ActionButton
              variant="soft"
              size="md"
              onClick={() => goToWeek(0)}
              disabled={week === 0}
            >
              Esta semana
            </ActionButton>
            <ActionButton
              variant="soft"
              size="md"
              onClick={() => goToWeek(shiftCalendarWeek(week, 1))}
              disabled={week === 1}
              ariaLabel="Semana siguiente"
            >
              <Icon name="ChevronRight" size={16} />
            </ActionButton>
          </nav>
        </header>

        {view === "loading" ? (
          <div
            className="grid grid-cols-1 xl:grid-cols-7 gap-3"
            data-testid="calendar-loading"
          >
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : null}

        {view === "untracked" ? (
          <EmptyState
            icon="Calendar"
            title="Tu calendario está vacío"
            body="Aquí aparecen los animes a los que les pongas un estado, el día que se emiten."
            action={{ href: "/season", label: "Explorar la temporada" }}
          />
        ) : null}

        {view === "error" ? (
          <EmptyState
            icon="AlertCircle"
            title="No pudimos cargar tu calendario"
            body="El servidor puede tardar en despertar. Vuelve a intentarlo en un momento."
            action={{ onClick: retry, label: "Reintentar" }}
          />
        ) : null}

        {shown ? (
          <>
            <FilterChips
              chips={chips}
              active={status}
              onChange={(next) => navigate(week, next)}
              ariaLabel="Filtrar por estado"
            />
            {isWeekEmpty(days) ? (
              <p className="text-sm text-white/70">
                Nada de lo que sigues se emite esta semana.
              </p>
            ) : null}
            {/* Paired with DayPicker's `xl:hidden`: both are mounted and CSS
                picks one, so the layout is right in the server render. */}
            <div className="hidden xl:block" data-testid="week-grid">
              <WeekGrid days={days} today={today} statuses={statusByAnimeId} />
            </div>
            <DayPicker
              days={days}
              today={today}
              selected={selected}
              onSelect={setPickedDay}
              statuses={statusByAnimeId}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}
