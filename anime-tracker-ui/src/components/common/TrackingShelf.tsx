"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useBatchAnimeEntries } from "@/hooks/useBatchAnimeEntries";
import { MinimalShelf } from "@/components/Shelf";
import { AnimeCard } from "@/components/AnimeCard";
import { Modal } from "@/components/custom/Modal";
import { AuthPrompt } from "@/components/common/AuthPrompt";
import { AddToListModal } from "@/components/common/AddToListModal";
import type { Anime } from "@/types/anime";
import { toggleFavorite as toggleFavoriteAction } from "@/actions/tracking";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface TrackingShelfProps {
  title: string;
  items: Anime[];
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  TrackingShelf                                                             */
/* -------------------------------------------------------------------------- */

export function TrackingShelf({ title, items, className }: TrackingShelfProps) {
  const { user } = useAuth();
  const router = useRouter();
  const animeIds = items.map((a) => a.id.anilist);
  const { entriesMap } = useBatchAnimeEntries(animeIds);

  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [variant, setVariant] = useState<"center" | "bottom-sheet">("center");

  // Responsive variant
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setVariant(mq.matches ? "bottom-sheet" : "center");
    const handler = (e: MediaQueryListEvent) =>
      setVariant(e.matches ? "bottom-sheet" : "center");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleAddToList = useCallback(
    (anime: Anime) => {
      if (!user) {
        // Check session storage guard
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
      // Call server action directly — AnimeCard does optimistic UI client-side
      toggleFavoriteAction(anime.id.anilist, next);
    },
    [user],
  );

  const handleClose = useCallback(() => {
    setSelectedAnime(null);
  }, []);

  const handleLoginNavigate = useCallback(() => {
    router.push("/login");
  }, [router]);

  const isModalOpen = !!selectedAnime;

  return (
    <>
      <MinimalShelf
        title={title}
        items={items}
        className={className}
        renderCard={(anime) => (
          <AnimeCard
            anime={anime}
            showTitleBelow
            onOpen={() => router.push(`/anime/${anime.id.anilist}`)}
            onAddToList={handleAddToList}
            onToggleFavorite={handleToggleFavorite}
            animeEntry={entriesMap.get(anime.id.anilist) ?? null}
            variant="default"
          />
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        variant={variant}
        aria-labelledby="tracking-modal-title"
      >
        {selectedAnime && !user ? (
          <AuthPrompt
            onClose={handleClose}
            onLoginNavigate={handleLoginNavigate}
          />
        ) : selectedAnime && user ? (
          <AddToListModal
            animeId={selectedAnime.id.anilist}
            currentEntry={entriesMap.get(selectedAnime.id.anilist) ?? null}
            onClose={handleClose}
          />
        ) : null}
      </Modal>
    </>
  );
}
