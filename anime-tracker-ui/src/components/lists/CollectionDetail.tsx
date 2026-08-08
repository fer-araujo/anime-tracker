"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";
import { fetchAnimeBatch } from "@/lib/fetchAnimeBatch";
import { AnimeCard } from "@/components/AnimeCard";
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
import { ListsBackdrop } from "./ListsBackdrop";
// The bar's colours, its reading order and the counting are shared with
// ListCard. They used to be local constants here, which is exactly how two
// surfaces showing the same list end up disagreeing about it.
import { STATUS_BAR_COLORS, buildStatusBreakdown } from "@/lib/lists";
import type { Anime, TrackingStatus } from "@/types/anime";

const STATUS_TABS: { key: TrackingStatus | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "watching", label: "Viendo" },
  { key: "completed", label: "Completados" },
  { key: "plan_to_watch", label: "Pendientes" },
  { key: "on_hold", label: "En pausa" },
  { key: "dropped", label: "Abandonados" },
];

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
  const { user } = useAuth();
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [activeStatus, setActiveStatus] = useState<TrackingStatus | "all">("all");
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const modalVariant = useResponsiveModalVariant();
  const { entriesMap } = useBatchAnimeEntries(animeIds);
  const { lists, refetch: refetchLists } = useUserLists();

  const listCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const list of lists) {
      for (const id of list.anime_ids) {
        map.set(id, (map.get(id) ?? 0) + 1);
      }
    }
    return map;
  }, [lists]);

  const avgScore = useMemo(() => {
    const scores = animeList
      .map((a) => entriesMap.get(a.id.anilist)?.score)
      .filter((score): score is number => score != null);
    if (scores.length === 0) return null;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }, [animeList, entriesMap]);

  const statusBreakdown = useMemo(() => {
    // Same counting the provider runs for the cards, so a list's bar reads the
    // same here as it does on /lists. `entriesMap` is keyed the way
    // buildStatusBreakdown expects, minus the entry wrapper.
    const statusByAnimeId = new Map<number, TrackingStatus>();
    for (const [animeId, entry] of entriesMap) {
      if (entry?.status) statusByAnimeId.set(animeId, entry.status);
    }
    return buildStatusBreakdown(
      statusByAnimeId,
      animeList.map((a) => a.id.anilist),
    );
  }, [animeList, entriesMap]);

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

  const filtered = useMemo(
    () =>
      activeStatus === "all"
        ? animeList
        : animeList.filter((a) => {
            const entry = entriesMap.get(a.id.anilist);
            if (!entry) return false;
            return entry.status === activeStatus;
          }),
    [animeList, activeStatus, entriesMap],
  );

  useEffect(() => {
    if (animeIds.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(false);
    fetchAnimeBatch(animeIds).then((data) => {
      if (data.size === 0) {
        setFetchError(true);
        setAnimeList([]);
        setLoading(false);
        return;
      }
      const items: Anime[] = [];
      for (const id of animeIds) {
        const entry = data.get(id);
        if (entry?.anime) {
          items.push(entry.anime);
        } else {
          items.push({
            id: { anilist: id, tmdb: null },
            title: entry?.title ?? `Anime #${id}`,
            providers: [],
            images: { poster: entry?.poster ?? null },
          });
        }
      }
      setAnimeList(items);
      setLoading(false);
    });
  }, [animeIds]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-6 md:px-10 lg:px-16 pb-16 bg-background">
        {/* Also on the early returns: without it the backdrop pops in only once
            the data lands, which reads as the page changing colour mid-load. */}
        <ListsBackdrop />
        <div className="max-w-7xl mx-auto">
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
      <div className="min-h-screen pt-24 px-6 md:px-10 lg:px-16 pb-16 bg-background">
        <ListsBackdrop />
        <div className="max-w-7xl mx-auto">
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

  return (
    <div className="min-h-screen pt-24 px-6 md:px-10 lg:px-16 pb-16 bg-background">
      <ListsBackdrop />

      <div className="max-w-7xl mx-auto">
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

        {animeList.length === 0 ? (
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
                  {animeList.length}{" "}
                  {animeList.length === 1 ? "anime" : "animes"}
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
                      style={{ width: `${(count / animeList.length) * 100}%` }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
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

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((anime) => (
                  <motion.div
                    key={anime.id.anilist}
                    layout={!prefersReduced}
                    initial={prefersReduced ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={
                      prefersReduced
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.85 }
                    }
                    transition={{
                      duration: prefersReduced ? 0.1 : 0.2,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <AnimeCard
                      anime={anime}
                      showTitleBelow
                      onOpen={() => router.push(`/anime/${anime.id.anilist}`)}
                      onAddToList={handleAddToList}
                      onToggleFavorite={handleToggleFavorite}
                      animeEntry={entriesMap.get(anime.id.anilist) ?? null}
                      listCount={listCountMap.get(anime.id.anilist) ?? 0}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
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
                  setAnimeList((prev) =>
                    prev.filter((a) => a.id.anilist !== removedId),
                  );
                }
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
