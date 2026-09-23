"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SurfaceBackdrop } from "@/components/common/SurfaceBackdrop";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useUserLists } from "@/hooks/useUserLists";
import { useBatchAnimeEntries } from "@/hooks/useBatchAnimeEntries";
import { fetchRecommendations, seedsMissing } from "@/lib/recommendations";
import { useDismissals } from "@/hooks/useDismissals";
import { normalizeViewMode } from "@/lib/season";
import { TrackableAnimeCard } from "@/components/season/TrackableAnimeCard";
import { TrackableAnimeListRow } from "@/components/common/TrackableAnimeListRow";
import { ViewToggle } from "@/components/common/ViewToggle";
import GridSkeleton from "@/components/Loaders/GridSkeleton";
import Icon from "@/components/custom/Icon";
import { cn } from "@/lib/utils";
import type { Anime } from "@/types/anime";
import type { ViewMode } from "@/types/view";

/**
 * Recommendations built from what the user already likes.
 *
 * The route always answers, which is why the empty state carries real content
 * rather than an error. Its header link is unconditional too: an entry that
 * appears and disappears cannot explain why it went, and with no permanent
 * section anywhere else the feature would have no point of discovery at all.
 * A screen that says what to do teaches; a missing link teaches nothing.
 */
export function RecommendationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { library, loading: libraryLoading } = useUserLists();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<Anime[]>([]);
  const [reserve, setReserve] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { visible, pending, dismiss, undo } = useDismissals({
    initial: items,
    reserve,
  });

  const viewMode = normalizeViewMode(searchParams.get("view"));

  const handleViewChange = useCallback(
    (mode: ViewMode) => {
      const p = new URLSearchParams(searchParams.toString());
      if (mode === "grid") p.delete("view");
      else p.set("view", mode);
      router.replace(`/recommendations?${p.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const seedCount = library.seeds.length;
  const missing = seedsMissing(seedCount);

  // The request body is the library, so it is also what decides whether a
  // refetch is warranted. Serialising the ids keeps this from firing on every
  // render just because the provider handed back a new array identity.
  const libraryKey = useMemo(
    () =>
      [
        library.seeds.map((s) => `${s.animeId}:${s.favorite ? 1 : 0}:${s.score ?? "-"}`).join(","),
        library.excludedIds.join(","),
      ].join("|"),
    [library],
  );

  useEffect(() => {
    if (authLoading || libraryLoading) return;
    if (!user || missing > 0) {
      setItems([]);
      setReserve([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchRecommendations(library, controller.signal)
      .then((resp) => {
        setItems(resp.data);
        setReserve(resp.reserve ?? []);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "No se pudieron cargar",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
    // `library` is covered by `libraryKey`; depending on the object itself
    // would refetch on every provider render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, libraryLoading, user, missing, libraryKey]);

  const animeIds = useMemo(() => visible.map((a) => a.id.anilist), [visible]);
  const { entriesMap, refetch: refetchEntries } = useBatchAnimeEntries(animeIds);
  const { refetch: refetchLists } = useUserLists();

  const handleTrackingChange = useCallback(() => {
    refetchEntries();
    refetchLists();
  }, [refetchEntries, refetchLists]);

  const handleOpen = useCallback(
    (anime: Anime) => router.push(`/anime/${anime.id.anilist}`),
    [router],
  );

  return (
    <div className="relative min-h-screen pb-16">
      {/* Brand green, like lists: recommendations are the user's own, and
          seasonal tones are kept for the calendar. */}
      <SurfaceBackdrop />
      {/* A fixed ceiling, not `max-w-3/4`. Three-quarters of the viewport is
          ~1400 px on a wide monitor, which is the look worth keeping, and ~270 px
          on a phone, which squeezed the whole page into a column a third of the
          screen wide. The pixel cap keeps the first and never causes the second. */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-10 lg:px-16 pt-32 md:pt-40">
        <div className="mb-8 md:mb-10">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
            Recomendaciones
          </h1>
          <p className="text-base md:text-lg text-white/60 mt-3 font-medium">
            {visible.length > 0
              ? `A partir de ${seedCount} ${seedCount === 1 ? "anime que te gusta" : "animes que te gustan"}.`
              : "A partir de lo que marcas como favorito y de tus mejores notas."}
          </p>
        </div>

        {visible.length > 0 && (
          <div className="mb-6 flex justify-end">
            <ViewToggle value={viewMode} onChange={handleViewChange} />
          </div>
        )}

        <Content
          authLoading={authLoading || libraryLoading}
          user={Boolean(user)}
          missing={missing}
          seedCount={seedCount}
          loading={loading}
          error={error}
          items={visible}
          pending={pending}
          onDismiss={dismiss}
          onUndo={undo}
          viewMode={viewMode}
          entriesMap={entriesMap}
          onOpen={handleOpen}
          onTrackingChange={handleTrackingChange}
        />
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

type ContentProps = {
  authLoading: boolean;
  user: boolean;
  missing: number;
  seedCount: number;
  loading: boolean;
  error: string | null;
  items: Anime[];
  pending: number[];
  onDismiss: (animeId: number) => void;
  onUndo: (animeId: number) => void;
  viewMode: ViewMode;
  entriesMap: ReturnType<typeof useBatchAnimeEntries>["entriesMap"];
  onOpen: (anime: Anime) => void;
  onTrackingChange: () => void;
};

function Content({
  authLoading,
  user,
  missing,
  seedCount,
  loading,
  error,
  items,
  pending,
  onDismiss,
  onUndo,
  viewMode,
  entriesMap,
  onOpen,
  onTrackingChange,
}: ContentProps) {
  if (authLoading) return <GridSkeleton variant="grid" count={10} />;

  if (!user) {
    return (
      <EmptyState
        icon="User"
        title="Inicia sesión para ver tus recomendaciones"
        body="Se construyen a partir de tus favoritos y tus notas, así que necesitan saber quién eres."
        action={{ href: "/login", label: "Iniciar sesión" }}
      />
    );
  }

  if (missing > 0) {
    return (
      <EmptyState
        icon="Heart"
        title={
          seedCount === 0
            ? "Aún no sabemos qué te gusta"
            : `Te ${missing === 1 ? "falta" : "faltan"} ${missing} ${missing === 1 ? "anime" : "animes"}`
        }
        // The number is the point. "Mark some favourites" leaves the user
        // guessing how many is some, and a threshold you cannot see is one you
        // cannot deliberately cross.
        body={
          seedCount === 0
            ? "Marca 3 animes como favoritos, o puntúa 3 con un 8 o más, y esta página se llena."
            : `Llevas ${seedCount}. Marca ${missing} más como favorito, o puntúa${missing === 1 ? "" : "los"} con un 8 o más.`
        }
        action={{ href: "/season", label: "Explorar la temporada" }}
      />
    );
  }

  if (loading) return <GridSkeleton variant="grid" count={10} />;

  if (error) {
    return (
      <EmptyState
        icon="AlertCircle"
        title="No se pudieron cargar las recomendaciones"
        body="Vuelve a intentarlo en un momento."
      />
    );
  }

  if (items.length === 0) {
    // Enough seeds and still nothing: the user has already tracked, listed or
    // dismissed everything the community associates with their taste. Saying so
    // is more useful than an empty grid.
    return (
      <EmptyState
        icon="Check"
        title="Nada nuevo por ahora"
        body="Ya tienes en tus listas todo lo que se parece a lo que te gusta. Marca algún favorito más y volveremos a buscar."
        action={{ href: "/season", label: "Explorar la temporada" }}
      />
    );
  }

  const isPending = (anime: Anime) => pending.includes(anime.id.anilist);

  if (viewMode === "list") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
        {items.map((anime) =>
          isPending(anime) ? (
            <UndoTile
              key={anime.id.anilist}
              anime={anime}
              onUndo={onUndo}
              compact
            />
          ) : (
            <div key={anime.id.anilist} className="relative group/row">
              <TrackableAnimeListRow
                anime={anime}
                onOpen={onOpen}
                animeEntry={entriesMap.get(anime.id.anilist) ?? null}
                onTrackingChange={onTrackingChange}
              />
              <DismissButton anime={anime} onDismiss={onDismiss} inRow />
            </div>
          ),
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5 lg:gap-6">
      {items.map((anime) =>
        isPending(anime) ? (
          <UndoTile key={anime.id.anilist} anime={anime} onUndo={onUndo} />
        ) : (
          // The button sits outside TrackableAnimeCard rather than inside it:
          // that card is shared with the season page, where dismissing means
          // nothing, and adding a prop it ignores everywhere else is how a
          // component starts collecting other screens' concerns.
          <div key={anime.id.anilist} className="relative group/card">
            <TrackableAnimeCard
              anime={anime}
              onOpen={onOpen}
              animeEntry={entriesMap.get(anime.id.anilist) ?? null}
              onTrackingChange={onTrackingChange}
            />
            <DismissButton anime={anime} onDismiss={onDismiss} />
          </div>
        ),
      )}
    </div>
  );
}

/**
 * Dismissal, offered on hover and always present for touch.
 *
 * `[@media(hover:hover)]` is doing real work: on a phone there is no hover, so
 * an opacity-0 control would be invisible and still occupy the tap target of
 * whatever sits under it.
 */
function DismissButton({
  anime,
  onDismiss,
  inRow = false,
}: {
  anime: Anime;
  onDismiss: (animeId: number) => void;
  inRow?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={`No me interesa ${anime.title}`}
      title="No me interesa"
      onClick={() => onDismiss(anime.id.anilist)}
      className={cn(
        "absolute z-20 grid place-items-center h-7 w-7 rounded-full cursor-pointer",
        "bg-black/70 border border-white/15 text-white/70 backdrop-blur-sm",
        "hover:bg-black/90 hover:text-white transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 [@media(hover:hover)]:group-hover/row:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100",
        // Top-right, where every dismiss control lives — ads, toasts, feed
        // cards, "not interested". Fighting that convention buys nothing.
        //
        // In the grid it overhangs the corner rather than sitting inside it.
        // AnimeCard's overlay fills that row with its score on the right and
        // status pills on the left, and reveals them on the same hover, so
        // anything within the padding lands on one or the other. The row has no
        // such header and keeps it inside.
        inRow ? "top-2 right-2" : "-top-2 -right-2 shadow-lg shadow-black/50",
      )}
    >
      <Icon name="X" size={14} />
    </button>
  );
}

/**
 * What a dismissed card leaves behind for a few seconds.
 *
 * In place rather than as a toast: the card's own slot is where the user was
 * looking, and a message at the edge of the screen asks them to find it again.
 * The row is already written to the database — waiting for this window to close
 * would lose the dismissal of anyone who navigates away immediately, which is
 * exactly when people dismiss things.
 */
function UndoTile({
  anime,
  onUndo,
  compact = false,
}: {
  anime: Anime;
  onUndo: (animeId: number) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-2 rounded-xl",
        "border border-dashed border-white/15 bg-white/5 px-3",
        compact ? "py-4" : "aspect-2/3",
      )}
    >
      <p className="text-xs text-white/50 line-clamp-2">
        Ocultamos <span className="text-white/75">{anime.title}</span>
      </p>
      <button
        type="button"
        onClick={() => onUndo(anime.id.anilist)}
        className="text-sm font-semibold text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        Deshacer
      </button>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: "Heart" | "User" | "AlertCircle" | "Check";
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[40vh] border border-dashed border-white/10 rounded-2xl bg-white/5 px-6 py-14">
      <Icon name={icon} size={40} className="text-white/25 mb-5" />
      <h2 className="text-xl font-bold text-white mb-2 text-balance">{title}</h2>
      <p className="text-white/55 max-w-md mb-6 text-balance">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="h-11 px-6 inline-flex items-center bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
