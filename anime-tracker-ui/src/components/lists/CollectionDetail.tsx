"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { fetchAnimeBatch } from "@/lib/fetchAnimeBatch";
import { AnimeCard } from "@/components/AnimeCard";
import { Modal } from "@/components/custom/Modal";
import { AuthPrompt } from "@/components/common/AuthPrompt";
import { AddToListModal } from "@/components/common/AddToListModal";
import Icon from "@/components/custom/Icon";
import Link from "next/link";
import { cn } from "@/lib/utils";
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
  listName,
  animeIds,
}: {
  listName: string;
  animeIds: number[];
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<TrackingStatus | "all">("all");
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [modalVariant, setModalVariant] = useState<"center" | "bottom-sheet">("center");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setModalVariant(mq.matches ? "bottom-sheet" : "center");
    const handler = (e: MediaQueryListEvent) =>
      setModalVariant(e.matches ? "bottom-sheet" : "center");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (animeIds.length === 0) {
      setLoading(false);
      return;
    }
    fetchAnimeBatch(animeIds).then((data) => {
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

  return (
    <div className="min-h-screen pt-24 px-6 md:px-10 lg:px-16 pb-16 bg-background">
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
            <div className="flex flex-wrap gap-2 mb-8">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveStatus(tab.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer border",
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
              {animeList.map((anime) => (
                <AnimeCard
                  key={anime.id.anilist}
                  anime={anime}
                  showTitleBelow
                  onOpen={() => router.push(`/anime/${anime.id.anilist}`)}
                  onAddToList={() => setSelectedAnime(anime)}
                />
              ))}
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
        >
          {!user ? (
            <AuthPrompt
              onClose={() => setSelectedAnime(null)}
              onLoginNavigate={() => router.push("/login")}
            />
          ) : (
            <AddToListModal
              animeId={selectedAnime.id.anilist}
              currentEntry={null}
              onClose={() => setSelectedAnime(null)}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
