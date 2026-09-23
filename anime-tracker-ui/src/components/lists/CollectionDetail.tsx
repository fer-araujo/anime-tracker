"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";
import { fetchAnimeBatch } from "@/lib/fetchAnimeBatch";
import { AnimeCard } from "@/components/AnimeCard";
import { AnimeListRow } from "@/components/common/AnimeListRow";
import { ViewToggle } from "@/components/common/ViewToggle";
import { Pagination } from "@/components/custom/Pagination";
import { Modal } from "@/components/custom/Modal";
import { AuthPrompt } from "@/components/common/AuthPrompt";
import { AddToListModal } from "@/components/common/AddToListModal";
import { useResponsiveModalVariant } from "@/hooks/useResponsiveModalVariant";
import { useBatchAnimeEntries } from "@/hooks/useBatchAnimeEntries";
import { useUserLists } from "@/hooks/useUserLists";
import { toggleFavorite as toggleFavoriteAction } from "@/actions/tracking";
import Icon from "@/components/custom/Icon";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { normalizeViewMode } from "@/lib/season";
import { SurfaceBackdrop } from "@/components/common/SurfaceBackdrop";
// The bar's colours, its reading order and the counting are shared with
// ListCard. They used to be local constants here, which is exactly how two
// surfaces showing the same list end up disagreeing about it.
import { STATUS_BAR_COLORS, buildStatusBreakdown } from "@/lib/lists";
import type { Anime, TrackingStatus } from "@/types/anime";
import type { ViewMode } from "@/types/view";

const STATUS_TABS: { key: TrackingStatus | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "watching", label: "Viendo" },
  { key: "completed", label: "Completados" },
  { key: "plan_to_watch", label: "Pendientes" },
  { key: "on_hold", label: "En pausa" },
  { key: "dropped", label: "Abandonados" },
];

/**
 * Below this a paginator is noise: it would offer a single page to click.
 * Matches the default page size, so a collection that fits the first page
 * shows no control at all.
 */
const PAGINATION_THRESHOLD = 20;

export function CollectionDetail({
  listId,
  listName,
  animeIds,
}: {
  listId?: string;
  listName: string;
  animeIds: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // The ids are the collection. Anime details are fetched per page and kept in
  // a cache, so the list itself is never the size of a network response — this
  // used to load every entry in one batch, which the endpoint caps at fifty.
  const [ids, setIds] = useState<number[]>(animeIds);
  const idsKey = animeIds.join(",");
  useEffect(() => {
    setIds(animeIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const [animeById, setAnimeById] = useState<Map<number, Anime>>(new Map());
  const [fetchError, setFetchError] = useState(false);
  const requested = useRef(new Set<number>());
  /** How many anime have arrived, read by the failure path without a render. */
  const loaded = useRef(0);

  const [activeStatus, setActiveStatus] = useState<TrackingStatus | "all">("all");
  const [pageSize, setPageSize] = useState(PAGINATION_THRESHOLD);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);

  const modalVariant = useResponsiveModalVariant();
  // Tracking rows come from Supabase, which has no fifty-id ceiling, and the
  // status filter, the average and the bar all need the whole collection — so
  // this one query keeps every id while the anime details stay per page.
  const { entriesMap } = useBatchAnimeEntries(ids);
  const { lists, refetch: refetchLists } = useUserLists();

  const viewMode = normalizeViewMode(searchParams.get("view"));

  // In the URL, as on the season page, so the view survives a refresh and
  // travels with a shared link. `grid` is the default and leaves no parameter.
  const handleViewChange = useCallback(
    (mode: ViewMode) => {
      const p = new URLSearchParams(searchParams.toString());
      if (mode === "grid") p.delete("view");
      else p.set("view", mode);
      const query = p.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname, searchParams],
  );

  const listCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const list of lists) {
      for (const id of list.anime_ids) {
        map.set(id, (map.get(id) ?? 0) + 1);
      }
    }
    return map;
  }, [lists]);

  // Over the collection's current ids, not over every entry the query returned:
  // removing an anime from the list has to take its score out of the average
  // immediately, before any refetch.
  const avgScore = useMemo(() => {
    const present = new Set(ids);
    const scores = [...entriesMap]
      .filter(([id]) => present.has(id))
      .map(([, entry]) => entry?.score)
      .filter((score): score is number => score != null);
    if (scores.length === 0) return null;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }, [ids, entriesMap]);

  const statusBreakdown = useMemo(() => {
    // Same counting the provider runs for the cards, so a list's bar reads the
    // same here as it does on /lists.
    const statusByAnimeId = new Map<number, TrackingStatus>();
    for (const [animeId, entry] of entriesMap) {
      if (entry?.status) statusByAnimeId.set(animeId, entry.status);
    }
    return buildStatusBreakdown(statusByAnimeId, ids);
  }, [ids, entriesMap]);

  const filteredIds = useMemo(
    () =>
      activeStatus === "all"
        ? ids
        : ids.filter((id) => entriesMap.get(id)?.status === activeStatus),
    [ids, activeStatus, entriesMap],
  );

  // Not on `entriesMap`: those rows arrive after the first render, and resetting
  // on them would throw someone back to page one mid-browse.
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatus, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredIds.length / pageSize));
  const page = Math.min(currentPage, totalPages);

  const pageIds = useMemo(
    () => filteredIds.slice((page - 1) * pageSize, page * pageSize),
    [filteredIds, page, pageSize],
  );
  const pageKey = pageIds.join(",");

  useEffect(() => {
    // Ids already requested are skipped, in flight or done, so returning to a
    // page costs nothing and a re-render cannot fire the same request twice.
    const missing = pageIds.filter((id) => !requested.current.has(id));
    if (missing.length === 0) return;
    for (const id of missing) requested.current.add(id);

    let cancelled = false;
    fetchAnimeBatch(missing).then((data) => {
      if (cancelled) return;

      if (data.size === 0) {
        // Forget them, so revisiting the page retries instead of showing
        // placeholders forever. Only a failure with nothing loaded yet is an
        // error screen; a later page failing keeps what is already on screen.
        for (const id of missing) requested.current.delete(id);
        if (loaded.current === 0) setFetchError(true);
        return;
      }

      loaded.current += missing.length;
      setAnimeById((prev) => {
        const next = new Map(prev);
        for (const id of missing) {
          const entry = data.get(id);
          next.set(
            id,
            entry?.anime ?? {
              id: { anilist: id, tmdb: null },
              title: entry?.title ?? `Anime #${id}`,
              providers: [],
              images: { poster: entry?.poster ?? null },
            },
          );
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  const handleAddToList = useCallback(
    (anime: Anime) => {
      if (!user) {
        try {
          if (sessionStorage.getItem("auth_prompt_seen")) return;
        } catch {
          // noop
        }
      }
      setSelectedAnime(anime);
    },
    [user],
  );

  const handleToggleFavorite = useCallback(
    (anime: Anime, next: boolean) => {
      if (!user) {
        try {
          if (sessionStorage.getItem("auth_prompt_seen")) return;
        } catch {
          // noop
        }
        setSelectedAnime(anime);
        return;
      }
      toggleFavoriteAction(anime.id.anilist, next);
    },
    [user],
  );

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const loading = ids.length > 0 && animeById.size === 0 && !fetchError;

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4 md:px-10 lg:px-16 pb-16 bg-background">
        {/* Also on the early returns: without it the backdrop pops in only once
            the data lands, which reads as the page changing colour mid-load. */}
        <SurfaceBackdrop />
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-md bg-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen pt-24 px-4 md:px-10 lg:px-16 pb-16 bg-background">
        <SurfaceBackdrop />
        <div className="relative z-10 max-w-7xl mx-auto">
          <Link
            href="/lists"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors mb-6"
          >
            <Icon name="ChevronLeft" size={16} />
            Volver a colecciones
          </Link>
          <div className="flex flex-col items-center justify-center min-h-[30vh] border border-dashed border-red-500/20 rounded-2xl bg-red-500/5 p-10">
            <Icon name="AlertCircle" size={40} className="text-red-400/60 mb-4" />
            <p className="text-red-300 text-lg mb-2">Error al cargar animes</p>
            <p className="text-white/40 text-sm text-center max-w-md">
              No se pudieron obtener los datos de esta colección. Intenta de nuevo más tarde.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const motionProps = {
    layout: !prefersReduced,
    initial: prefersReduced ? false : { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.85 },
    transition: {
      duration: prefersReduced ? 0.1 : 0.2,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  };

  return (
    <div className="min-h-screen pt-24 px-4 md:px-10 lg:px-16 pb-16 bg-background">
      <SurfaceBackdrop />

      <div className="relative z-10 max-w-7xl mx-auto">
        <Link
          href="/lists"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors mb-6"
        >
          <Icon name="ChevronLeft" size={16} />
          Volver a colecciones
        </Link>

        <h1 className="text-2xl md:text-3xl font-semibold text-white mb-6">
          {listName}
        </h1>

        {ids.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] border border-dashed border-white/10 rounded-2xl bg-white/[0.02] p-10">
            <Icon name="List" size={40} className="text-white/20 mb-4" />
            <p className="text-white/50 text-lg mb-2">Lista vacía</p>
            <p className="text-white/30 text-sm">
              Añade animes desde la temporada o búsqueda
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="flex items-center gap-4 flex-wrap text-sm text-white/50">
                <span>
                  {ids.length} {ids.length === 1 ? "anime" : "animes"}
                </span>
                {avgScore != null && (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                    <Icon name="Star" size={14} />
                    {avgScore.toFixed(1)} promedio
                  </span>
                )}
              </div>
              {statusBreakdown.length > 0 && (
                <div className="flex h-1.5 w-full max-w-sm rounded-full overflow-hidden bg-white/5 mt-3">
                  {statusBreakdown.map(({ status, count }) => (
                    <span
                      key={status}
                      className={STATUS_BAR_COLORS[status]}
                      style={{ width: `${(count / ids.length) * 100}%` }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
              <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveStatus(tab.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 cursor-pointer border",
                      activeStatus === tab.key
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-white/5 text-white/50 border-white/10 hover:text-white hover:bg-white/10",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <ViewToggle value={viewMode} onChange={handleViewChange} />
            </div>

            {viewMode === "list" ? (
              // Same columns as the season list: one on phones, two from large
              // screens, where a full-width row would leave half the line empty.
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
                <AnimatePresence mode="popLayout">
                  {pageIds.map((id) => {
                    const anime = animeById.get(id);
                    return (
                      <motion.div key={id} {...motionProps}>
                        {anime ? (
                          <AnimeListRow
                            anime={anime}
                            onOpen={() => router.push(`/anime/${id}`)}
                            onAddToList={handleAddToList}
                            onToggleFavorite={handleToggleFavorite}
                            animeEntry={entriesMap.get(id) ?? null}
                            listCount={listCountMap.get(id) ?? 0}
                          />
                        ) : (
                          <div className="h-[6.5rem] rounded-xl bg-white/5 animate-pulse" />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <AnimatePresence mode="popLayout">
                  {pageIds.map((id) => {
                    const anime = animeById.get(id);
                    return (
                      <motion.div key={id} {...motionProps}>
                        {anime ? (
                          <AnimeCard
                            anime={anime}
                            showTitleBelow
                            onOpen={() => router.push(`/anime/${id}`)}
                            onAddToList={handleAddToList}
                            onToggleFavorite={handleToggleFavorite}
                            animeEntry={entriesMap.get(id) ?? null}
                            listCount={listCountMap.get(id) ?? 0}
                          />
                        ) : (
                          // A slot for a card still on its way, so the grid
                          // keeps its shape while the next page loads.
                          <div className="aspect-[2/3] rounded-md bg-white/5 animate-pulse" />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {filteredIds.length > PAGINATION_THRESHOLD && (
              <div className="mt-12">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={filteredIds.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </>
        )}
      </div>

      {selectedAnime && (
        <Modal
          isOpen={!!selectedAnime}
          onClose={() => setSelectedAnime(null)}
          variant={modalVariant}
          aria-labelledby="tracking-modal-title"
          hideClose
        >
          {!user ? (
            <AuthPrompt
              onClose={() => setSelectedAnime(null)}
              onLoginNavigate={() => router.push("/login")}
            />
          ) : (
            <AddToListModal
              animeId={selectedAnime.id.anilist}
              currentEntry={entriesMap.get(selectedAnime.id.anilist) ?? null}
              onClose={() => setSelectedAnime(null)}
              onListsChanged={({ removed }) => {
                refetchLists();
                if (listId && removed.includes(listId)) {
                  const removedId = selectedAnime.id.anilist;
                  setIds((prev) => prev.filter((id) => id !== removedId));
                }
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
