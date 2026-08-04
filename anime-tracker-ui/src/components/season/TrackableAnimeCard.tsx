"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { AnimeCard } from "@/components/AnimeCard";
import { Modal } from "@/components/custom/Modal";
import { AuthPrompt } from "@/components/common/AuthPrompt";
import { AddToListModal } from "@/components/common/AddToListModal";
import { useResponsiveModalVariant } from "@/hooks/useResponsiveModalVariant";
import { toggleFavorite as toggleFavoriteAction } from "@/actions/tracking";
import type { Anime, AnimeEntry } from "@/types/anime";

type Props = {
  anime: Anime;
  onOpen?: (anime: Anime) => void;
  /**
   * Tracking state is owned by the parent grid, not fetched here. This
   * component used to call useAnimeEntry itself, which meant one Supabase
   * round-trip per card — 20 by default and up to 100 when the user raises
   * the page size. The parent batches them into a single query.
   */
  animeEntry?: AnimeEntry | null;
  listCount?: number;
  /** Lets the parent re-run its batched queries once the modal writes. */
  onTrackingChange?: () => void;
};

export function TrackableAnimeCard({
  anime,
  onOpen,
  animeEntry = null,
  listCount = 0,
  onTrackingChange,
}: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const variant = useResponsiveModalVariant();

  const handleAddToList = useCallback(() => {
    if (!user) {
      try {
        if (sessionStorage.getItem("auth_prompt_seen")) return;
      } catch {
        // Storage can throw in private mode; the prompt is not worth failing on.
      }
    }
    setShowModal(true);
  }, [user]);

  const handleToggleFavorite = useCallback(
    (_a: Anime, next: boolean) => {
      if (!user) {
        try {
          if (sessionStorage.getItem("auth_prompt_seen")) return;
        } catch {
          // See above.
        }
        setShowModal(true);
        return;
      }
      // AnimeCard already flipped its own optimistic state, so this only needs
      // to persist. Matches how TrackingShelf drives the same action.
      toggleFavoriteAction(anime.id.anilist, next);
    },
    [user, anime.id.anilist],
  );

  const handleClose = useCallback(() => {
    setShowModal(false);
    onTrackingChange?.();
  }, [onTrackingChange]);

  const handleLoginNavigate = useCallback(() => {
    router.push("/login");
  }, [router]);

  return (
    <>
      <AnimeCard
        anime={anime}
        variant="compact"
        showTitleBelow
        onOpen={onOpen}
        animeEntry={animeEntry}
        listCount={listCount}
        onAddToList={handleAddToList}
        onToggleFavorite={handleToggleFavorite}
      />

      <Modal
        isOpen={showModal}
        onClose={handleClose}
        variant={variant}
        aria-labelledby="tracking-modal-title"
        hideClose
      >
        {!user ? (
          <AuthPrompt
            onClose={handleClose}
            onLoginNavigate={handleLoginNavigate}
          />
        ) : (
          <AddToListModal
            animeId={anime.id.anilist}
            currentEntry={animeEntry}
            onClose={handleClose}
          />
        )}
      </Modal>
    </>
  );
}
