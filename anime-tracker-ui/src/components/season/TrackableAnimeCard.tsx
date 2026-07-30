"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useAnimeEntry } from "@/hooks/useAnimeEntry";
import { AnimeCard } from "@/components/AnimeCard";
import { Modal } from "@/components/custom/Modal";
import { AuthPrompt } from "@/components/common/AuthPrompt";
import { AddToListModal } from "@/components/common/AddToListModal";
import { useResponsiveModalVariant } from "@/hooks/useResponsiveModalVariant";
import type { Anime } from "@/types/anime";

type Props = {
  anime: Anime;
  onOpen?: (anime: Anime) => void;
};

export function TrackableAnimeCard({ anime, onOpen }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const { entry, toggleFavorite, refetch } = useAnimeEntry(anime.id.anilist);
  const [showModal, setShowModal] = useState(false);
  const variant = useResponsiveModalVariant();

  const handleAddToList = useCallback(() => {
    if (!user) {
      try {
        if (sessionStorage.getItem("auth_prompt_seen")) return;
      } catch {
        // noop
      }
    }
    setShowModal(true);
  }, [user]);

  const handleToggleFavorite = useCallback(
    (a: Anime, next: boolean) => {
      if (!user) {
        try {
          if (sessionStorage.getItem("auth_prompt_seen")) return;
        } catch {
          // noop
        }
        setShowModal(true);
        return;
      }
      toggleFavorite(next);
    },
    [user, toggleFavorite],
  );

  const handleClose = useCallback(() => {
    setShowModal(false);
    refetch();
  }, [refetch]);

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
        animeEntry={entry}
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
            currentEntry={entry}
            onClose={handleClose}
          />
        )}
      </Modal>
    </>
  );
}
