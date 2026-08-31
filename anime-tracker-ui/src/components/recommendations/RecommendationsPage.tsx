"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useUserLists } from "@/hooks/useUserLists";
import { useBatchAnimeEntries } from "@/hooks/useBatchAnimeEntries";
import { fetchRecommendations, seedsMissing } from "@/lib/recommendations";
import { normalizeViewMode } from "@/lib/season";
import { TrackableAnimeCard } from "@/components/season/TrackableAnimeCard";
import { AnimeListRow } from "@/components/common/AnimeListRow";
import { ViewToggle } from "@/components/common/ViewToggle";
import GridSkeleton from "@/components/Loaders/GridSkeleton";
import Icon from "@/components/custom/Icon";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchRecommendations(library, controller.signal)
      .then((resp) => setItems(resp.data))
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

  const animeIds = useMemo(() => items.map((a) => a.id.anilist), [items]);
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
    <div className="relative min-h-screen bg-background pb-16">
      <main className="relative z-10 max-w-3/4 mx-auto px-6 md:px-10 lg:px-16 pt-32 md:pt-40">
        <div className="mb-8 md:mb-10">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
            Recomendaciones
          </h1>
          <p className="text-base md:text-lg text-white/60 mt-3 font-medium">
            {items.length > 0
              ? `A partir de ${seedCount} ${seedCount === 1 ? "anime que te gusta" : "animes que te gustan"}.`
              : "A partir de lo que marcas como favorito y de tus mejores notas."}
          </p>
        </div>

        {items.length > 0 && (
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
          items={items}
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

  if (viewMode === "list") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
        {items.map((anime) => (
          <AnimeListRow key={anime.id.anilist} anime={anime} onOpen={onOpen} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5 lg:gap-6">
      {items.map((anime) => (
        <TrackableAnimeCard
          key={anime.id.anilist}
          anime={anime}
          onOpen={onOpen}
          animeEntry={entriesMap.get(anime.id.anilist) ?? null}
          onTrackingChange={onTrackingChange}
        />
      ))}
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
